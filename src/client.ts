import type { CheckOptions, PackageUpdateURL, UpdateResponse, UpdateSource } from './types';
import {
  CheckError,
  EndpointError,
  ErrInvalidBaseURL,
  ErrInvalidEdgeURL,
  ErrMissingAppName,
  ErrMissingBaseURL,
  ErrMissingOwner,
  ErrMissingVersion,
  ValidationError,
} from './errors';

const DEFAULT_TIMEOUT_MS = 30_000;
const USER_AGENT = 'faynosync-js/1.0';

export interface Config {
  readonly baseURL: string;
  readonly edgeURL?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
}

interface RawUpdateResponse {
  update_available?: boolean;
  update_url?: string;
  changelog?: string;
  critical?: boolean;
  is_intermediate_required?: boolean;
  possible_rollback?: boolean;
  [key: string]: unknown;
}

export class Client {
  private readonly baseURL: string;
  private readonly edgeURL: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(cfg: Config) {
    this.baseURL = cfg.baseURL;
    this.edgeURL = cfg.edgeURL ?? '';
    this.fetchFn = cfg.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async checkForUpdates(opts: CheckOptions, signal?: AbortSignal): Promise<UpdateResponse> {
    this.validateConfig();
    validateCheckOptions(opts);

    const sig = signal ?? null;
    let edgeError: Error | undefined;

    if (this.edgeURL !== '') {
      try {
        const resp = await this.checkEdge(opts, sig);
        if (opts.deviceId) {
          try {
            await this.sendEdgeTelemetryBeacon(opts, !resp.updateAvailable, sig);
          } catch {
            // telemetry failures don't affect the update check result
          }
        }
        return { ...resp, source: 'edge' };
      } catch (err) {
        edgeError = err as Error;
        if (signal?.aborted === true) {
          throw new CheckError(edgeError);
        }
      }
    }

    try {
      const resp = await this.checkAPI(opts, sig);
      return { ...resp, source: 'api' };
    } catch (apiError) {
      throw new CheckError(edgeError, apiError as Error);
    }
  }

  private validateConfig(): void {
    if (this.baseURL.trim() === '') {
      throw ErrMissingBaseURL;
    }
    parseAbsoluteURL(this.baseURL, ErrInvalidBaseURL);
  }

  private async checkEdge(opts: CheckOptions, signal: AbortSignal | null): Promise<UpdateResponse> {
    const url = this.buildEdgeCheckURL(opts);
    return this.doUpdateRequest(url, opts.deviceId, 'edge', signal);
  }

  private async checkAPI(opts: CheckOptions, signal: AbortSignal | null): Promise<UpdateResponse> {
    const url = this.buildAPICheckURL(opts);
    return this.doUpdateRequest(url, opts.deviceId, 'api', signal);
  }

  private async doUpdateRequest(
    url: string,
    deviceId: string | undefined,
    source: UpdateSource,
    signal: AbortSignal | null,
  ): Promise<UpdateResponse> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    };
    if (deviceId) {
      headers['X-Device-ID'] = deviceId;
    }

    const reqSignal = createRequestSignal(signal, this.timeoutMs);

    let res: Response;
    try {
      res = await this.fetchFn(url, { headers, signal: reqSignal });
    } catch (err) {
      throw new EndpointError(source, url, undefined, err as Error);
    }

    if (res.status !== 200) {
      await res.body?.cancel();
      throw new EndpointError(source, url, res.status);
    }

    let raw: RawUpdateResponse;
    try {
      raw = (await res.json()) as RawUpdateResponse;
    } catch (err) {
      throw new EndpointError(source, url, undefined, err as Error);
    }

    return parseUpdateResponse(raw);
  }

  private buildAPICheckURL(opts: CheckOptions): string {
    const u = parseAbsoluteURL(this.baseURL, ErrInvalidBaseURL);
    u.pathname = joinURLPath(u.pathname, 'checkVersion');
    u.search = new URLSearchParams({
      app_name: opts.appName,
      version: opts.version,
      channel: opts.channel ?? '',
      platform: opts.platform ?? '',
      arch: opts.arch ?? '',
      owner: opts.owner,
    }).toString();
    return u.toString();
  }

  private buildEdgeCheckURL(opts: CheckOptions): string {
    const u = parseAbsoluteURL(this.edgeURL, ErrInvalidEdgeURL);
    const segments = [
      'responses',
      opts.owner,
      opts.appName,
      opts.channel ?? '',
      opts.platform ?? '',
      opts.arch ?? '',
      `${opts.version.replace(/-/g, '.')}.json`,
    ];
    const base = (u.origin + u.pathname).replace(/\/+$/, '');
    return `${base}/${segments.map(encodeURIComponent).join('/')}`;
  }

  private buildEdgeTelemetryBeaconURL(opts: CheckOptions, isLatest: boolean): string {
    const u = parseAbsoluteURL(this.baseURL, ErrInvalidBaseURL);
    u.pathname = joinURLPath(u.pathname, 'telemetry/beacon');
    u.search = new URLSearchParams({
      app_name: opts.appName,
      version: opts.version,
      channel: opts.channel ?? '',
      platform: opts.platform ?? '',
      arch: opts.arch ?? '',
      owner: opts.owner,
      is_latest: String(isLatest),
    }).toString();
    return u.toString();
  }

  private async sendEdgeTelemetryBeacon(
    opts: CheckOptions,
    isLatest: boolean,
    signal: AbortSignal | null,
  ): Promise<void> {
    const url = this.buildEdgeTelemetryBeaconURL(opts, isLatest);
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
    if (opts.deviceId) {
      headers['X-Device-ID'] = opts.deviceId;
    }

    const reqSignal = createRequestSignal(signal, this.timeoutMs);
    const res = await this.fetchFn(url, { headers, signal: reqSignal });
    await res.body?.cancel();
    if (res.status !== 200) {
      throw new EndpointError('edge', url, res.status);
    }
  }
}

function validateCheckOptions(opts: CheckOptions): void {
  if (!opts.owner) throw ErrMissingOwner;
  if (!opts.appName) throw ErrMissingAppName;
  if (!opts.version) throw ErrMissingVersion;
}

function parseAbsoluteURL(raw: string, sentinel: ValidationError): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw sentinel;
  }
  if (!u.protocol || !u.hostname) {
    throw sentinel;
  }
  return u;
}

function joinURLPath(basePath: string, segment: string): string {
  if (basePath === '' || basePath === '/') {
    return `/${segment}`;
  }
  return `${basePath.replace(/\/+$/, '')}/${segment}`;
}

function createRequestSignal(userSignal: AbortSignal | null, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (userSignal === null) return timeoutSignal;

  if (userSignal.aborted) {
    const c = new AbortController();
    c.abort(userSignal.reason);
    return c.signal;
  }

  const controller = new AbortController();
  const abort = (reason: unknown) => controller.abort(reason);
  userSignal.addEventListener('abort', () => abort(userSignal.reason), { once: true });
  timeoutSignal.addEventListener('abort', () => abort(timeoutSignal.reason), { once: true });
  return controller.signal;
}

function parseUpdateResponse(raw: RawUpdateResponse): UpdateResponse {
  const packageUrls: PackageUpdateURL[] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('update_url_') && typeof value === 'string') {
      packageUrls.push({ package: key.slice('update_url_'.length), url: value });
    }
  }

  packageUrls.sort((a, b) => a.package.localeCompare(b.package));

  return {
    updateAvailable: raw.update_available ?? false,
    updateUrl: raw.update_url ?? '',
    changelog: raw.changelog ?? '',
    critical: raw.critical ?? false,
    isIntermediateRequired: raw.is_intermediate_required ?? false,
    possibleRollback: raw.possible_rollback ?? false,
    packageUrls,
    source: 'unknown',
  };
}
