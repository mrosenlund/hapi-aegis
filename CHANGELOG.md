# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `contentSecurityPolicy` directives accept function values `(request) => string | string[]`, either as the whole directive value or as items inside a mixed array. Functions are invoked during `onPreResponse` with the Hapi `request`, enabling per-request nonces, hashes, and other dynamic CSP values. Works on both normal and Boom error responses. (#7)
- `contentSecurityPolicy` now supports `generateNonces: true`. When enabled, `hapi-aegis` generates a fresh base64 nonce per request, exposes it on `request.plugins.aegis.nonce` for handlers and templates, and automatically appends `'nonce-<value>'` to `script-src` and `style-src`. Works on Boom responses and can be toggled per route via `plugins.aegis.contentSecurityPolicy.generateNonces`. (#2)

## [1.1.0] - 2026-04-22

### Added

- `permissionsPolicy` middleware — sets the `Permissions-Policy` header with a restrictive default that denies `accelerometer`, `camera`, `geolocation`, `gyroscope`, `magnetometer`, `microphone`, `payment`, and `usb`. Configurable per feature via the `features` option with allowlist arrays. (#4)

## [1.0.0] - 2026-04-20

### Added

- Initial release of hapi-aegis.
- Core plugin with `onPreResponse` extension applying security headers to both normal responses and Boom error responses.
- Route-level overrides via `plugins.aegis` on any route's config, merged with server-level options (route wins per-middleware).
- TypeScript definitions (`index.d.ts`) covering plugin options, every middleware's config, and route-level override shape.
- Middlewares:
  - `contentSecurityPolicy` — sets `Content-Security-Policy` (or `Content-Security-Policy-Report-Only` when `reportOnly: true`); merges user directives over built-in defaults when `useDefaults: true`; converts camelCase directive names to kebab-case.
  - `crossOriginEmbedderPolicy` — sets `Cross-Origin-Embedder-Policy`.
  - `crossOriginOpenerPolicy` — sets `Cross-Origin-Opener-Policy`.
  - `crossOriginResourcePolicy` — sets `Cross-Origin-Resource-Policy`.
  - `dnsPrefetchControl` — sets `X-DNS-Prefetch-Control`.
  - `expectCt` — sets `Expect-CT` with `maxAge`, `enforce`, and `reportUri` options.
  - `frameguard` — sets `X-Frame-Options` (`DENY` or `SAMEORIGIN`).
  - `hidePoweredBy` — removes `X-Powered-By` and `Server` response headers.
  - `hsts` — sets `Strict-Transport-Security` with `maxAge`, `includeSubDomains`, and `preload` options.
  - `ieNoOpen` — sets `X-Download-Options: noopen`.
  - `noSniff` — sets `X-Content-Type-Options: nosniff`.
  - `originAgentCluster` — sets `Origin-Agent-Cluster: ?1`.
  - `permittedCrossDomainPolicies` — sets `X-Permitted-Cross-Domain-Policies`.
  - `referrerPolicy` — sets `Referrer-Policy`.
  - `xssFilter` — sets `X-XSS-Protection: 0`.

[1.0.0]: https://github.com/mrosenlund/hapi-aegis/releases/tag/v1.0.0
