# hapi-aegis

[![npm version](https://img.shields.io/npm/v/hapi-aegis.svg)](https://www.npmjs.com/package/hapi-aegis)
[![CI](https://github.com/mrosenlund/hapi-aegis/actions/workflows/ci.yml/badge.svg)](https://github.com/mrosenlund/hapi-aegis/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/badge/coverage-%E2%89%A595%25-brightgreen.svg)](https://github.com/mrosenlund/hapi-aegis)
[![license](https://img.shields.io/npm/l/hapi-aegis.svg)](./LICENSE)

A Hapi.js plugin that sets security-related HTTP response headers — one plugin, sensible defaults, per-middleware and per-route configuration.

## Why hapi-aegis?

The Node security-header landscape is dominated by [Helmet](https://helmetjs.github.io/), which is Express-only. Hapi developers who want the same coverage today either wire up several single-purpose plugins or hand-roll an `onPreResponse` extension that sets a dozen headers and juggles Boom error responses. `hapi-aegis` fills that gap: one plugin, every common header, with first-class support for Hapi conventions — `plugins.aegis` route overrides, Boom-aware response handling, and zero runtime dependencies beyond the `@hapi/hapi` peer. It is inspired by Helmet, but built natively for Hapi rather than ported.

## Quick Start

```bash
npm install hapi-aegis
```

```js
const Hapi = require('@hapi/hapi');
const Aegis = require('hapi-aegis');

const server = Hapi.server({ host: 'localhost', port: 3000 });
await server.register(Aegis);
await server.start();
```

That's it — every response now carries a secure baseline set of headers. See [`examples/basic.js`](./examples/basic.js) and [`examples/custom.js`](./examples/custom.js) for runnable servers.

## API Reference

Register with options to customise any middleware. Pass `false` to any middleware key to disable it entirely, or pass an options object to override its defaults.

```js
await server.register({
    plugin: require('hapi-aegis'),
    options: {
        hsts: { maxAge: 63072000, preload: true },
        frameguard: { action: 'deny' },
        xssFilter: false
    }
});
```

### Middleware summary

| Middleware | Header | Default | Options |
|---|---|---|---|
| `contentSecurityPolicy` | `Content-Security-Policy` | built-in directive set (see [Content Security Policy](#content-security-policy)) | `directives`, `useDefaults`, `reportOnly` |
| `crossOriginEmbedderPolicy` | `Cross-Origin-Embedder-Policy` | `require-corp` | `policy` |
| `crossOriginOpenerPolicy` | `Cross-Origin-Opener-Policy` | `same-origin` | `policy` |
| `crossOriginResourcePolicy` | `Cross-Origin-Resource-Policy` | `same-origin` | `policy` |
| `dnsPrefetchControl` | `X-DNS-Prefetch-Control` | `off` | `allow` |
| `expectCt` | `Expect-CT` | `max-age=0` | `maxAge`, `enforce`, `reportUri` (deprecated — see [FAQ](#faq)) |
| `frameguard` | `X-Frame-Options` | `SAMEORIGIN` | `action` |
| `hidePoweredBy` | removes `X-Powered-By` and `Server` | — | none (boolean) |
| `hsts` | `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | `maxAge`, `includeSubDomains`, `preload` |
| `ieNoOpen` | `X-Download-Options` | `noopen` | none (boolean) |
| `noSniff` | `X-Content-Type-Options` | `nosniff` | none (boolean) |
| `originAgentCluster` | `Origin-Agent-Cluster` | `?1` | none (boolean) |
| `permittedCrossDomainPolicies` | `X-Permitted-Cross-Domain-Policies` | `none` | `permittedPolicies` |
| `referrerPolicy` | `Referrer-Policy` | `no-referrer` | `policy` |
| `xssFilter` | `X-XSS-Protection` | `0` | none (boolean) — see [FAQ](#faq) |

### contentSecurityPolicy

Sets `Content-Security-Policy` (or `Content-Security-Policy-Report-Only` when `reportOnly` is `true`). See the [Content Security Policy](#content-security-policy) section for the default directives, merging rules, and warnings.

- `directives` *(object)* — map of camelCase directive names to a string or array of sources.
- `useDefaults` *(boolean, default `true`)* — merge your directives with the built-in defaults; when `false`, only your directives are used.
- `reportOnly` *(boolean, default `false`)* — switch the header name to `Content-Security-Policy-Report-Only`.

### crossOriginEmbedderPolicy

Sets `Cross-Origin-Embedder-Policy`.

- `policy` *(string, default `'require-corp'`)* — one of `require-corp`, `credentialless`, `unsafe-none`.

### crossOriginOpenerPolicy

Sets `Cross-Origin-Opener-Policy`.

- `policy` *(string, default `'same-origin'`)* — one of `same-origin`, `same-origin-allow-popups`, `unsafe-none`.

### crossOriginResourcePolicy

Sets `Cross-Origin-Resource-Policy`.

- `policy` *(string, default `'same-origin'`)* — one of `same-origin`, `same-site`, `cross-origin`.

### dnsPrefetchControl

Sets `X-DNS-Prefetch-Control`.

- `allow` *(boolean, default `false`)* — when `true` emits `on`, otherwise `off`.

### expectCt

Sets `Expect-CT`. The underlying header is deprecated by browsers; this middleware exists for legacy compatibility and is easy to disable with `expectCt: false`.

- `maxAge` *(integer, default `0`)* — non-negative seconds.
- `enforce` *(boolean, default `false`)* — adds the `enforce` directive.
- `reportUri` *(string, optional)* — quoted in the header value.

### frameguard

Sets `X-Frame-Options`.

- `action` *(string, default `'sameorigin'`)* — `deny` or `sameorigin` (case-insensitive; emitted in upper case).

### hidePoweredBy

Removes `X-Powered-By` and `Server` from responses. No options — enable or disable with `true` / `false`.

### hsts

Sets `Strict-Transport-Security`.

- `maxAge` *(integer, default `15552000` — 180 days)* — non-negative seconds.
- `includeSubDomains` *(boolean, default `true`)* — adds `includeSubDomains`.
- `preload` *(boolean, default `false`)* — adds `preload`; only use if you intend to submit to the [HSTS preload list](https://hstspreload.org/).

### ieNoOpen

Sets `X-Download-Options: noopen`. No options.

### noSniff

Sets `X-Content-Type-Options: nosniff`. No options.

### originAgentCluster

Sets `Origin-Agent-Cluster: ?1`. No options.

### permittedCrossDomainPolicies

Sets `X-Permitted-Cross-Domain-Policies`.

- `permittedPolicies` *(string, default `'none'`)* — one of `none`, `master-only`, `by-content-type`, `all`.

### referrerPolicy

Sets `Referrer-Policy`.

- `policy` *(string or string[], default `'no-referrer'`)* — one or more of `no-referrer`, `no-referrer-when-downgrade`, `origin`, `origin-when-cross-origin`, `same-origin`, `strict-origin`, `strict-origin-when-cross-origin`, `unsafe-url`. When an array is given, values are joined with `, ` for fallback handling.

### xssFilter

Sets `X-XSS-Protection: 0`. No options. See the [FAQ](#faq) for the rationale.

## Content Security Policy

CSP is the most involved header, so it gets its own section.

### Defaults

With `useDefaults: true` (the default) the built-in directives are:

```js
{
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    fontSrc: ["'self'", 'https:', 'data:'],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
    upgradeInsecureRequests: []
}
```

Which produces:

```
Content-Security-Policy: default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests
```

### Custom directives (merging)

When `useDefaults: true`, user directives are merged with defaults on a **per-key replace** basis. Providing `scriptSrc` fully replaces the default `scriptSrc`; it is not concatenated.

```js
options: {
    contentSecurityPolicy: {
        directives: {
            scriptSrc: ["'self'", 'https://cdn.example.com'],
            imgSrc: ["'self'", 'data:', 'https://images.example.com']
        }
    }
}
```

All other default directives (`defaultSrc`, `styleSrc`, etc.) are kept as-is.

### Opting out of defaults

Set `useDefaults: false` to emit only your directives:

```js
contentSecurityPolicy: {
    useDefaults: false,
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"]
    }
}
```

### Report-only mode

```js
contentSecurityPolicy: {
    reportOnly: true,
    directives: { reportUri: ['/csp-report'] }
}
```

This switches the emitted header name to `Content-Security-Policy-Report-Only`.

### Naming and edge cases

- **camelCase → kebab-case.** Directive names are given in camelCase and converted automatically: `scriptSrcAttr` → `script-src-attr`, `upgradeInsecureRequests` → `upgrade-insecure-requests`.
- **Empty-array directives.** A directive whose value is `[]` renders without a value — useful for flag-style directives like `upgradeInsecureRequests: []`.
- **Unknown directives.** `hapi-aegis` warns via `console.warn` for directives it doesn't recognise, but still emits them. The CSP spec evolves; this is a nudge, not an error.
- **Unquoted keywords.** Values like `self`, `none`, and `unsafe-inline` must be single-quoted (`"'self'"`). Bare usage triggers a `console.warn` so a missing quote doesn't silently weaken the policy.

## Route-Level Configuration

Every middleware can be overridden per route via `options.plugins.aegis`. Route-level settings take precedence for the middlewares they mention; everything else falls back to the server-level configuration.

```js
server.route({
    method: 'GET',
    path: '/api',
    options: {
        plugins: {
            aegis: {
                contentSecurityPolicy: false,        // disable CSP for this route
                frameguard: { action: 'deny' }       // tighten X-Frame-Options here
            }
        }
    },
    handler: () => ({ ok: true })
});
```

Common patterns:

- **Disable a header for a specific endpoint.** JSON APIs often don't need CSP — set `contentSecurityPolicy: false` on the route.
- **Relax CSP for a page that needs third-party scripts.** Provide a different `directives` object on that route only.
- **Tighten one route past the server default.** For instance, `frameguard: { action: 'deny' }` on an admin page while the rest of the site runs `SAMEORIGIN`.

## Comparison with Helmet

If you're used to Helmet on Express, the Hapi API will feel familiar.

**Express + Helmet**

```js
const express = require('express');
const helmet = require('helmet');

const app = express();
app.use(helmet());
```

**Hapi + hapi-aegis**

```js
const Hapi = require('@hapi/hapi');
const Aegis = require('hapi-aegis');

const server = Hapi.server();
await server.register(Aegis);
```

Custom CSP looks nearly identical:

**Express + Helmet**

```js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            scriptSrc: ["'self'", 'https://cdn.example.com']
        }
    }
}));
```

**Hapi + hapi-aegis**

```js
await server.register({
    plugin: Aegis,
    options: {
        contentSecurityPolicy: {
            directives: {
                scriptSrc: ["'self'", 'https://cdn.example.com']
            }
        }
    }
});
```

## See Also

`hapi-aegis` keeps CSP configuration static — policies are set at register time, not per request. If you need per-request nonces for `script-src` / `style-src` (to avoid `'unsafe-inline'` with inline scripts or styles), or a CSP that varies per request, use **[blankie](https://github.com/nlf/blankie)** instead. You can run both: set `contentSecurityPolicy: false` in `hapi-aegis` options and let blankie handle CSP while `hapi-aegis` handles the other headers.

## FAQ

**Does this work with Boom error responses?**

Yes. The plugin attaches an `onPreResponse` extension that detects Boom responses (`response.isBoom`) and applies headers to `response.output.headers`. A 400 or 500 response gets the same security headers as a 200.

**Can I use this alongside other Hapi auth/validation plugins?**

Yes. `hapi-aegis` only reads and writes response headers in an `onPreResponse` extension; it doesn't touch routing, authentication, validation, or the request lifecycle. Register it alongside `@hapi/jwt`, `@hapi/bell`, `joi`-based validation, and so on without conflict.

**Why is `X-XSS-Protection` set to `0`?**

The legacy `X-XSS-Protection` filter has known bypasses and can be used as an XSS vector in itself. Modern browsers have removed or deprecated it. The safe default — matching Helmet — is to emit `0` so any residual browser behaviour is explicitly disabled, and to rely on `Content-Security-Policy` for XSS mitigation.

**Is `expectCt` deprecated?**

Yes. The `Expect-CT` header is deprecated by browsers. The middleware is included for legacy compatibility and sets `max-age=0` by default, which is effectively a no-op. Disable it entirely with `expectCt: false` if you have no use for it.

## Contributing

1. Fork the repo and create a feature branch.
2. `npm install` to pull dev dependencies.
3. Make your change. Keep the middleware pattern (pure function, `{ header, value }` out) and prefix all thrown errors with `hapi-aegis:`.
4. Add tests. Run `npm test` — the suite must pass with ≥95% coverage.
5. Run `npm run lint`.
6. Open a pull request. Use [conventional commits](https://www.conventionalcommits.org/) for commit messages (e.g. `feat(hsts): …`, `fix(core): …`).

## Acknowledgements

`hapi-aegis`'s option shapes, middleware scope, and sensible defaults are modeled after [Helmet](https://helmetjs.github.io/), the Express security-headers middleware. The implementation is independent — hapi's request lifecycle, Boom error handling, and route-level plugin configuration are all hapi-native — but the API similarity is intentional to make the plugin feel familiar to developers coming from Express.

## License

MIT © 2026 Matt Rosenlund — see [LICENSE](./LICENSE).
