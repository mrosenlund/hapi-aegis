# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Unreleased

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
