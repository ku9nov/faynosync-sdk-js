import type { CheckOptions, NativeFeedOptions, NativeUpdater } from './types';
import {
  ErrInvalidBaseURL,
  ErrMissingAppName,
  ErrMissingArch,
  ErrMissingOwner,
  ErrMissingPlatform,
  ErrMissingVersion,
  UnsupportedUpdaterError,
} from './errors';
import { joinURLPath, parseAbsoluteURL } from './url';

// Builds the canonical /checkVersion URL shared by the SDK's own `manual` flow and
// by native updaters that poll a JSON feed (squirrel_darwin, and later tauri/etc).
export function buildCheckVersionURL(baseURL: string, opts: CheckOptions, updater: string): string {
  const u = parseAbsoluteURL(baseURL, ErrInvalidBaseURL);
  u.pathname = joinURLPath(u.pathname, 'checkVersion');
  u.search = new URLSearchParams({
    app_name: opts.appName,
    version: opts.version,
    channel: opts.channel ?? '',
    platform: opts.platform ?? '',
    arch: opts.arch ?? '',
    owner: opts.owner,
    updater,
  }).toString();
  return u.toString();
}

type NativeFeedURLBuilder = (baseURL: string, opts: NativeFeedOptions) => string;

function checkVersionFeed(baseURL: string, opts: NativeFeedOptions): string {
  return buildCheckVersionURL(baseURL, opts, opts.updater);
}

// Squirrel.Windows polls a base URL and appends `/RELEASES` itself, matching the
// /update/:owner/:app/:channel/:platform/:arch/:version route.
function updatePathFeed(baseURL: string, opts: NativeFeedOptions): string {
  const u = parseAbsoluteURL(baseURL, ErrInvalidBaseURL);
  const segments = [
    'update',
    opts.owner,
    opts.appName,
    opts.channel ?? '',
    opts.platform ?? '',
    opts.arch ?? '',
    opts.version,
  ];
  const base = (u.origin + u.pathname).replace(/\/+$/, '');
  return `${base}/${segments.map(encodeURIComponent).join('/')}`;
}

interface NativeUpdaterSpec {
  readonly buildFeedURL: NativeFeedURLBuilder;
  // edgeCacheable: the updater polls a /checkVersion-style JSON feed, so the server
  // mirrors its response to `responses/.../{updater}/{version}.json` on the edge and
  // resolveNativeFeed can serve it from there. updatePath-style feeds cannot.
  readonly edgeCacheable: boolean;
}

// Extension point: register a new native updater here. Most updaters reuse
// `checkVersionFeed` + `edgeCacheable: true`; add a new builder only when the
// framework expects a different URL shape.
const NATIVE_UPDATER_SPECS: Record<NativeUpdater, NativeUpdaterSpec> = {
  squirrel_darwin: { buildFeedURL: checkVersionFeed, edgeCacheable: true },
  squirrel_windows: { buildFeedURL: updatePathFeed, edgeCacheable: false },
};

export const NATIVE_UPDATERS = Object.keys(NATIVE_UPDATER_SPECS) as readonly NativeUpdater[];

function getSpec(updater: NativeUpdater): NativeUpdaterSpec {
  const spec = NATIVE_UPDATER_SPECS[updater] as NativeUpdaterSpec | undefined;
  if (spec === undefined) {
    throw new UnsupportedUpdaterError(updater);
  }
  return spec;
}

export function isEdgeCacheableUpdater(updater: NativeUpdater): boolean {
  return getSpec(updater).edgeCacheable;
}

function validateNativeFeedOptions(opts: NativeFeedOptions): void {
  if (!opts.owner) throw ErrMissingOwner;
  if (!opts.appName) throw ErrMissingAppName;
  if (!opts.version) throw ErrMissingVersion;
  if (!opts.platform) throw ErrMissingPlatform;
  if (!opts.arch) throw ErrMissingArch;
}

export function buildNativeFeedURL(baseURL: string, opts: NativeFeedOptions): string {
  const spec = getSpec(opts.updater);
  validateNativeFeedOptions(opts);
  return spec.buildFeedURL(baseURL, opts);
}
