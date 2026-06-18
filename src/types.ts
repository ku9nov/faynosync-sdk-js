export type UpdateSource = 'unknown' | 'edge' | 'api';

export type EndpointSource = UpdateSource | 'report';

export interface PackageUpdateURL {
  readonly package: string;
  readonly url: string;
}

export interface CheckOptions {
  readonly owner: string;
  readonly appName: string;
  readonly version: string;
  readonly channel?: string;
  readonly platform?: string;
  readonly arch?: string;
  readonly deviceId?: string;
}

export interface UpdateResponse {
  readonly updateAvailable: boolean;
  readonly updateUrl: string;
  readonly changelog: string;
  readonly critical: boolean;
  readonly isIntermediateRequired: boolean;
  readonly possibleRollback: boolean;
  readonly packageUrls: readonly PackageUpdateURL[];
  readonly source: UpdateSource;
}

export type ReportEventType =
  | 'crash'
  | 'startup_failure'
  | 'update_failure'
  | 'install_failure'
  | 'rollback_failure';

export interface ReportEvent {
  readonly type: ReportEventType;
  readonly reason: string;
}

export interface ReportOptions {
  readonly reportKey: string;
  readonly deviceId: string;
  readonly appName: string;
  readonly version: string;
  readonly channel: string;
  readonly platform: string;
  readonly arch: string;
  readonly event: ReportEvent;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface ReportResponse {
  readonly status: string;
  readonly groupHash: string;
  readonly storedDetails: boolean;
}
