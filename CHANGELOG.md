# Changelog

## 0.1.0

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
