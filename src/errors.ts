import type { UpdateSource } from './types';

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
    public readonly source: UpdateSource,
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

export const ErrMissingBaseURL = new ValidationError('faynosync: missing base URL');
export const ErrInvalidBaseURL = new ValidationError('faynosync: invalid base URL');
export const ErrInvalidEdgeURL = new ValidationError('faynosync: invalid edge URL');
export const ErrMissingOwner = new ValidationError('faynosync: missing owner');
export const ErrMissingAppName = new ValidationError('faynosync: missing app name');
export const ErrMissingVersion = new ValidationError('faynosync: missing version');
