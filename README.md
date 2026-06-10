# faynoSync JS SDK

Production-oriented JavaScript/TypeScript SDK for checking application updates with faynoSync.

This package is a small typed transport and developer experience layer. It does not implement update installation, platform normalization, metadata verification, caching, or business rules.

## Requirements

Node.js 18 or later.

## Installation

```sh
npm install @faynosync/sdk-js
```

## Quick Start

```ts
import { Client } from '@faynosync/sdk-js';

const client = new Client({
  baseURL: 'https://api.example.com',
});

const resp = await client.checkForUpdates({
  owner: 'admin',
  appName: 'test',
  version: '0.0.0.5',
  channel: 'nightly',
  platform: 'darwin',
  arch: 'arm64',
});

if (resp.updateAvailable) {
  if (resp.updateUrl !== '') {
    console.log('Update available:', resp.updateUrl);
  }
  for (const pkg of resp.packageUrls) {
    console.log(`${pkg.package} update available:`, pkg.url);
  }
}
```

## Configuration

```ts
import { Client } from '@faynosync/sdk-js';

const client = new Client({
  baseURL: 'https://api.example.com',
  edgeURL: 'https://cdn.example.com',
  timeoutMs: 10_000,
  fetch: customFetch,
});
```

`baseURL` is required. It points to the faynoSync API.

`edgeURL` is optional. When configured, the SDK tries a static edge JSON response before falling back to the API.

`timeoutMs` is optional. Defaults to `30000`. Applied to every request.

`fetch` is optional. When omitted, the SDK uses `globalThis.fetch` (Node.js 18+ built-in). Supply a custom function to configure proxies, connection pooling, or logging.

The client is safe for concurrent use.

## Update Checks

`checkForUpdates` returns a typed response:

```ts
const resp = await client.checkForUpdates({
  owner: 'admin',
  appName: 'test',
  version: '0.0.0.5',
  channel: 'nightly',
  platform: 'darwin',
  arch: 'arm64',
  deviceId: 'optional-device-id',
});
```

`deviceId` is optional. When set, the SDK sends it as the `X-Device-ID` header and triggers a telemetry beacon after a successful edge response.

An optional `AbortSignal` can be passed as the second argument to cancel the request:

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 5_000);

const resp = await client.checkForUpdates(opts, controller.signal);
```

## Base API Request

The `baseURL` API request uses `GET /checkVersion`:

```
GET /checkVersion?app_name=test&version=0.0.0.5&channel=nightly&platform=darwin&arch=arm64&owner=admin
X-Device-ID: optional
```

## Response Model

faynoSync may return a direct binary update URL:

```json
{
  "update_available": true,
  "update_url": "https://downloads.example.com/app"
}
```

It may also return package-specific URLs with dynamic field names:

```json
{
  "update_available": true,
  "update_url_deb": "https://downloads.example.com/app.deb",
  "update_url_rpm": "https://downloads.example.com/app.rpm",
  "changelog": "### Changelog\n\n- Added feature X",
  "critical": true,
  "is_intermediate_required": true,
  "possible_rollback": true
}
```

The SDK decodes these into a typed `UpdateResponse`:

```ts
if (resp.updateUrl !== '') {
  console.log(resp.updateUrl);
}

for (const pkg of resp.packageUrls) {
  console.log(pkg.package, pkg.url);
}
```

`packageUrls` is always sorted alphabetically by package name.

`source` identifies where the response came from: `'edge'`, `'api'`, or `'unknown'`.

## EdgeURL Fallback

When `edgeURL` is configured, the SDK first tries a static JSON response:

```
GET /responses/{owner}/{appName}/{channel}/{platform}/{arch}/{version}.json
```

For example:

```
GET /responses/admin/test/nightly/darwin/arm64/0.0.0.5.json
```

If the edge response succeeds with HTTP 200 and valid JSON, `resp.source` is `'edge'`.

The SDK falls back to the `baseURL` API when the edge request has:

- a network error
- a timeout
- invalid JSON
- HTTP 404
- any other non-200 response

If the fallback API succeeds, `resp.source` is `'api'`.

## Platform, Channel, and Architecture Values

faynoSync supports fully custom platform, channel, and architecture values. This SDK never normalizes or remaps them.

The SDK will not change values such as:

- `macos` to `darwin`
- `osx` to `darwin`
- `stable` to `default`

Whatever string you pass in `channel`, `platform`, and `arch` is the string sent to faynoSync.

## Optional System Helpers

The SDK provides optional helpers that return the current Node.js runtime values:

```ts
import { systemPlatform, systemArch } from '@faynosync/sdk-js';

const platform = systemPlatform(); // process.platform — e.g. 'darwin', 'linux', 'win32'
const arch     = systemArch();     // process.arch    — e.g. 'arm64', 'x64'
```

These helpers are never called automatically. Use them only when Node.js runtime values match your faynoSync configuration.

## Error Handling

The SDK validates required fields and throws typed errors:

```ts
import {
  Client,
  RequestFailedError,
  EndpointError,
  CheckError,
  ErrMissingBaseURL,
  ErrMissingOwner,
  ErrMissingAppName,
  ErrMissingVersion,
} from '@faynosync/sdk-js';

try {
  const resp = await client.checkForUpdates(opts);
} catch (err) {
  if (err === ErrMissingBaseURL) {
    // configure Client baseURL
  } else if (err === ErrMissingOwner) {
    // set opts.owner
  } else if (err === ErrMissingAppName) {
    // set opts.appName
  } else if (err === ErrMissingVersion) {
    // set opts.version
  } else if (err instanceof RequestFailedError) {
    // all endpoints failed — inspect for details
    if (err instanceof CheckError) {
      console.error('edge error:', err.edgeError?.message);
      console.error('api error:', err.apiError?.message);
    }
    if (err instanceof EndpointError) {
      console.error('url:', err.endpointUrl);
      console.error('status:', err.statusCode);
    }
  }
}
```

Validation errors (`ErrMissing*`, `ErrInvalid*`) are singleton instances — use `===` to check them. Request failures are class instances — use `instanceof` to narrow them.

## Examples

Runnable examples are available in:

- [`examples/basic`](examples/basic) — minimal setup using runtime platform/arch detection
- [`examples/edge-fallback`](examples/edge-fallback) — `edgeURL` configured with `deviceId` telemetry
- [`examples/custom-fetch`](examples/custom-fetch) — custom `fetch` function and `timeoutMs`

Run any example with:

```sh
npx ts-node examples/basic/index.ts
```

## Security Scope

This SDK version performs update-check transport requests and typed response decoding only.

It does not verify TUF metadata, signatures, thresholds, expiration, rollback protection, or cache safety. Applications that need secure update metadata verification must perform that verification in the appropriate faynoSync component or a future SDK layer that explicitly implements it.

No signature, threshold, expiration, rollback, freeze, root-of-trust, or cache protection is weakened by this transport-only SDK.
