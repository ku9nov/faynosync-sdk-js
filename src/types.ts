export type UpdateSource = 'unknown' | 'edge' | 'api';

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
