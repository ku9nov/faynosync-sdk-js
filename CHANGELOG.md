# Changelog

## 0.5.0

### Added

- `Client.resolveNativeFeed` to resolve a native updater feed edge-first with API fallback, returning `NativeFeedResult` (`updateAvailable`, `feedURL`, `source`, `url`) so callers skip the native updater on no-update and keep the API offloaded when the edge is warm. `squirrel_windows` is edge-served too: the SDK reads the edge redirect response and returns the CDN `RELEASES` directory (trailing `/RELEASES` stripped) as `feedURL`, falling back to the API `/update/...` base on a miss

## 0.4.0

### Added

- `Client.buildNativeFeedURL` to build framework-native updater feed URLs (`squirrel_darwin`, `squirrel_windows`), with typed `NativeFeedOptions` / `NativeUpdater`, the `NATIVE_UPDATERS` list, and `UnsupportedUpdaterError`

## 0.3.0

### Added

- `reportEvent` for posting failure/diagnostic reports to `POST /reports/ingest`, with typed `ReportOptions` / `ReportResponse` and gzip+base64 `details` payloads
- Optional `deviceId` sent as `X-Device-ID`, including an edge telemetry beacon after successful edge responses
- New validation errors: `ErrMissingReportKey`, `ErrMissingDeviceId`, `ErrMissingChannel`, `ErrMissingPlatform`, `ErrMissingArch`, `ErrInvalidEventType`, `ErrInvalidReason`


## 0.2.1

### Fixed

- Normalize `-` to `.` in the edge version path segment so URLs like `2.0.0-4` resolve to the correct static response (matches Base API behavior)

## 0.2.0

Initial release of the faynoSync JS SDK (transport layer only).

### Added

- `Client` with `checkForUpdates` against the Base API (`GET /checkVersion`)
- Optional `edgeURL` static JSON lookup with automatic API fallback
- Typed `CheckOptions`, `UpdateResponse`, and package URL decoding
- `EndpointError` and `CheckError` for typed request failure handling
- Sentinel validation errors for missing/invalid configuration
- Optional `systemPlatform` / `systemArch` helpers (Node.js `process.platform` / `process.arch`)
- `AbortSignal` support for request cancellation
- Custom `fetch` support for transport customization (`timeoutMs`, keep-alive, proxies)
- Examples: basic, edge fallback, custom fetch
