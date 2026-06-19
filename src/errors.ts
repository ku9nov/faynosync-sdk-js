import type { EndpointSource } from './types';

export class FaynoSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FaynoSyncError';
  }
}

export class ValidationError extends FaynoSyncError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RequestFailedError extends FaynoSyncError {
  constructor(message: string) {
    super(message);
    this.name = 'RequestFailedError';
  }
}

export class EndpointError extends RequestFailedError {
  constructor(
    public readonly source: EndpointSource,
    public readonly endpointUrl: string,
    public readonly statusCode?: number,
    cause?: Error,
  ) {
    let msg: string;
    if (statusCode !== undefined) {
      msg = `faynosync: request failed: ${endpointUrl} returned HTTP ${statusCode}`;
    } else if (cause !== undefined) {
      msg = `faynosync: request failed: ${endpointUrl}: ${cause.message}`;
    } else {
      msg = `faynosync: request failed: ${endpointUrl}`;
    }
    super(msg);
    this.name = 'EndpointError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class CheckError extends RequestFailedError {
  constructor(
    public readonly edgeError?: Error,
    public readonly apiError?: Error,
  ) {
    let msg: string;
    if (edgeError !== undefined && apiError !== undefined) {
      msg = `faynosync: request failed: edge failed: ${edgeError.message}; api failed: ${apiError.message}`;
    } else if (edgeError !== undefined) {
      msg = `faynosync: request failed: edge failed: ${edgeError.message}`;
    } else if (apiError !== undefined) {
      msg = `faynosync: request failed: api failed: ${apiError.message}`;
    } else {
      msg = 'faynosync: request failed';
    }
    super(msg);
    this.name = 'CheckError';
  }
}

export class UnsupportedUpdaterError extends ValidationError {
  constructor(public readonly updater: string) {
    super(`faynosync: unsupported updater: ${updater}`);
    this.name = 'UnsupportedUpdaterError';
  }
}

export const ErrMissingBaseURL = new ValidationError('faynosync: missing base URL');
export const ErrInvalidBaseURL = new ValidationError('faynosync: invalid base URL');
export const ErrInvalidEdgeURL = new ValidationError('faynosync: invalid edge URL');
export const ErrMissingOwner = new ValidationError('faynosync: missing owner');
export const ErrMissingAppName = new ValidationError('faynosync: missing app name');
export const ErrMissingVersion = new ValidationError('faynosync: missing version');
export const ErrMissingReportKey = new ValidationError('faynosync: missing report key');
export const ErrMissingDeviceId = new ValidationError('faynosync: missing device id');
export const ErrMissingChannel = new ValidationError('faynosync: missing channel');
export const ErrMissingPlatform = new ValidationError('faynosync: missing platform');
export const ErrMissingArch = new ValidationError('faynosync: missing arch');
export const ErrInvalidEventType = new ValidationError('faynosync: invalid event type');
export const ErrInvalidReason = new ValidationError('faynosync: invalid event reason');
