'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const Csp = require('../../lib/middlewares/contentSecurityPolicy');

const { describe, it } = exports.lab = Lab.script();

const captureWarnings = (fn) => {

    const original = console.warn;
    const warnings = [];
    console.warn = (msg) => warnings.push(msg);
    try {
        fn();
    }
    finally {
        console.warn = original;
    }
    return warnings;
};

const DEFAULT_VALUE = [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' https: data:",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self' https: 'unsafe-inline'",
    'upgrade-insecure-requests'
].join('; ');

describe('contentSecurityPolicy middleware', () => {

    describe('unit — defaults', () => {

        it('returns the full default policy when no options are provided', () => {

            expect(Csp()).to.equal({ header: 'Content-Security-Policy', value: DEFAULT_VALUE });
        });

        it('returns the full default policy with an empty options object', () => {

            expect(Csp({})).to.equal({ header: 'Content-Security-Policy', value: DEFAULT_VALUE });
        });

        it('returns the full default policy with explicit useDefaults: true', () => {

            expect(Csp({ useDefaults: true })).to.equal({ header: 'Content-Security-Policy', value: DEFAULT_VALUE });
        });
    });

    describe('unit — useDefaults: true merging', () => {

        it('replaces a default directive entirely (not concatenated) when user provides it', () => {

            const result = Csp({ directives: { scriptSrc: ["'self'", 'cdn.example.com'] } });
            expect(result.value).to.contain("script-src 'self' cdn.example.com");
            expect(result.value).to.not.contain("script-src 'self';"); // guard: no default-only entry
            // other defaults still present
            expect(result.value).to.contain("default-src 'self'");
            expect(result.value).to.contain("object-src 'none'");
        });

        it('appends a new directive that is not in defaults', () => {

            const result = Csp({ directives: { mediaSrc: ["'self'"] } });
            expect(result.value).to.contain("media-src 'self'");
            expect(result.value).to.contain("default-src 'self'");
            expect(result.value.endsWith("media-src 'self'")).to.be.true();
        });

        it('user override does not concatenate with default array', () => {

            const result = Csp({ directives: { imgSrc: ['https://images.example.com'] } });
            expect(result.value).to.contain('img-src https://images.example.com');
            expect(result.value).to.not.contain("img-src 'self'");
        });
    });

    describe('unit — useDefaults: false', () => {

        it('uses only user directives', () => {

            const result = Csp({
                useDefaults: false,
                directives: { defaultSrc: ["'self'"] }
            });
            expect(result).to.equal({ header: 'Content-Security-Policy', value: "default-src 'self'" });
        });

        it('produces an empty value when no directives are supplied', () => {

            const result = Csp({ useDefaults: false });
            expect(result).to.equal({ header: 'Content-Security-Policy', value: '' });
        });

        it('renders multiple user directives joined with "; "', () => {

            const result = Csp({
                useDefaults: false,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", 'cdn.example.com']
                }
            });
            expect(result.value).to.equal("default-src 'self'; script-src 'self' cdn.example.com");
        });
    });

    describe('unit — reportOnly', () => {

        it('switches the header name when reportOnly: true', () => {

            const result = Csp({ reportOnly: true });
            expect(result.header).to.equal('Content-Security-Policy-Report-Only');
            expect(result.value).to.equal(DEFAULT_VALUE);
        });

        it('uses Content-Security-Policy when reportOnly: false', () => {

            expect(Csp({ reportOnly: false }).header).to.equal('Content-Security-Policy');
        });

        it('uses Content-Security-Policy when reportOnly is omitted', () => {

            expect(Csp().header).to.equal('Content-Security-Policy');
        });

        it('only explicit true enables report-only (truthy non-true does not)', () => {

            expect(Csp({ reportOnly: 'yes' }).header).to.equal('Content-Security-Policy');
            expect(Csp({ reportOnly: 1 }).header).to.equal('Content-Security-Policy');
        });
    });

    describe('unit — camelCase to kebab-case', () => {

        it('converts defaultSrc to default-src', () => {

            const result = Csp({ useDefaults: false, directives: { defaultSrc: ["'self'"] } });
            expect(result.value).to.equal("default-src 'self'");
        });

        it('converts frameAncestors to frame-ancestors', () => {

            const result = Csp({ useDefaults: false, directives: { frameAncestors: ["'self'"] } });
            expect(result.value).to.equal("frame-ancestors 'self'");
        });

        it('converts scriptSrcAttr to script-src-attr (two hyphens)', () => {

            const result = Csp({ useDefaults: false, directives: { scriptSrcAttr: ["'none'"] } });
            expect(result.value).to.equal("script-src-attr 'none'");
        });

        it('converts upgradeInsecureRequests to upgrade-insecure-requests', () => {

            const result = Csp({ useDefaults: false, directives: { upgradeInsecureRequests: [] } });
            expect(result.value).to.equal('upgrade-insecure-requests');
        });

        it('leaves all-lowercase names unchanged', () => {

            const result = Csp({ useDefaults: false, directives: { sandbox: [] } });
            expect(result.value).to.equal('sandbox');
        });
    });

    describe('unit — empty-array directives', () => {

        it('renders an empty-array default directive as bare name (upgrade-insecure-requests)', () => {

            expect(DEFAULT_VALUE.endsWith('upgrade-insecure-requests')).to.be.true();
            expect(DEFAULT_VALUE).to.not.contain('upgrade-insecure-requests ;');
        });

        it('renders a user-supplied empty-array directive as a bare name', () => {

            const result = Csp({ useDefaults: false, directives: { sandbox: [] } });
            expect(result.value).to.equal('sandbox');
        });

        it('joins a bare directive to others with "; "', () => {

            const result = Csp({
                useDefaults: false,
                directives: {
                    sandbox: [],
                    defaultSrc: ["'self'"]
                }
            });
            expect(result.value).to.equal("sandbox; default-src 'self'");
        });
    });

    describe('unit — unknown-directive warning', () => {

        it('warns when a user directive is not on the known list', () => {

            const warnings = captureWarnings(() => Csp({ directives: { fooSrc: ["'self'"] } }));
            expect(warnings).to.have.length(1);
            expect(warnings[0]).to.equal('hapi-aegis: unknown CSP directive "foo-src"');
        });

        it('still includes the unknown directive in the header', () => {

            let result;
            captureWarnings(() => {

                result = Csp({ useDefaults: false, directives: { fooSrc: ["'self'"] } });
            });
            expect(result.value).to.equal("foo-src 'self'");
        });

        it('warns once per unknown directive across multiple unknowns', () => {

            const warnings = captureWarnings(() => Csp({
                useDefaults: false,
                directives: { fooSrc: ["'self'"], barSrc: ["'self'"] }
            }));
            expect(warnings).to.have.length(2);
            expect(warnings[0]).to.contain('foo-src');
            expect(warnings[1]).to.contain('bar-src');
        });

        it('does not warn when only default directives are in play', () => {

            const warnings = captureWarnings(() => Csp());
            expect(warnings).to.have.length(0);
        });
    });

    describe('unit — unquoted-keyword warning', () => {

        it('warns on bare "self"', () => {

            const warnings = captureWarnings(() => Csp({ useDefaults: false, directives: { scriptSrc: ['self'] } }));
            expect(warnings).to.have.length(1);
            expect(warnings[0]).to.equal('hapi-aegis: CSP directive "script-src" has value "self" without quotes; did you mean "\'self\'"?');
        });

        it('warns on bare "none"', () => {

            const warnings = captureWarnings(() => Csp({ useDefaults: false, directives: { objectSrc: ['none'] } }));
            expect(warnings).to.have.length(1);
            expect(warnings[0]).to.contain('"none"');
        });

        it('warns on bare "unsafe-inline"', () => {

            const warnings = captureWarnings(() => Csp({ useDefaults: false, directives: { styleSrc: ['unsafe-inline'] } }));
            expect(warnings).to.have.length(1);
            expect(warnings[0]).to.contain('"unsafe-inline"');
        });

        it('does not warn when keywords are properly quoted', () => {

            const warnings = captureWarnings(() => Csp({ useDefaults: false, directives: { scriptSrc: ["'self'", "'unsafe-inline'"] } }));
            expect(warnings).to.have.length(0);
        });

        it('warns once in a mixed array that has both quoted and bare keywords', () => {

            const warnings = captureWarnings(() => Csp({ useDefaults: false, directives: { scriptSrc: ["'self'", 'unsafe-inline'] } }));
            expect(warnings).to.have.length(1);
            expect(warnings[0]).to.contain('"unsafe-inline"');
        });

        it('does not warn on scheme-only values like https: and data:', () => {

            const warnings = captureWarnings(() => Csp({ useDefaults: false, directives: { imgSrc: ['https:', 'data:'] } }));
            expect(warnings).to.have.length(0);
        });

        it('does not warn on the default policy', () => {

            const warnings = captureWarnings(() => Csp());
            expect(warnings).to.have.length(0);
        });
    });

    describe('unit — string value normalization', () => {

        it('treats a bare string as a single-element array', () => {

            const result = Csp({ useDefaults: false, directives: { defaultSrc: "'self'" } });
            expect(result.value).to.equal("default-src 'self'");
        });

        it('produces identical output for string and single-element-array inputs', () => {

            const fromString = Csp({ useDefaults: false, directives: { scriptSrc: "'self'" } });
            const fromArray = Csp({ useDefaults: false, directives: { scriptSrc: ["'self'"] } });
            expect(fromString).to.equal(fromArray);
        });

        it('does not warn for a bare-string normalization (quiet ergonomic convenience)', () => {

            const warnings = captureWarnings(() => Csp({ useDefaults: false, directives: { scriptSrc: "'self'" } }));
            expect(warnings).to.have.length(0);
        });
    });

    describe('unit — null / undefined directive skip', () => {

        const directiveNames = (value) => value.split('; ').map((part) => part.split(' ')[0]);

        it('drops a default directive when the user passes null for its key', () => {

            const result = Csp({ directives: { scriptSrc: null } });
            const names = directiveNames(result.value);
            expect(names).to.not.contain('script-src');
            expect(names).to.contain('script-src-attr'); // only scriptSrc dropped, others intact
            expect(names).to.contain('default-src');
        });

        it('drops a default directive when the user passes undefined for its key', () => {

            const result = Csp({ directives: { scriptSrc: undefined } });
            const names = directiveNames(result.value);
            expect(names).to.not.contain('script-src');
            expect(names).to.contain('script-src-attr');
        });

        it('null skip does not affect other directives', () => {

            const result = Csp({ directives: { scriptSrc: null } });
            // verify every other default is still present
            expect(result.value).to.contain("default-src 'self'");
            expect(result.value).to.contain("base-uri 'self'");
            expect(result.value).to.contain("font-src 'self' https: data:");
            expect(result.value).to.contain("form-action 'self'");
            expect(result.value).to.contain("frame-ancestors 'self'");
            expect(result.value).to.contain("img-src 'self' data:");
            expect(result.value).to.contain("object-src 'none'");
            expect(result.value).to.contain("script-src-attr 'none'");
            expect(result.value).to.contain("style-src 'self' https: 'unsafe-inline'");
            expect(result.value).to.contain('upgrade-insecure-requests');
        });
    });

    describe('unit — deduplication', () => {

        it('emits only one entry when the same directive arrives under two key casings', () => {

            const result = Csp({
                useDefaults: false,
                directives: {
                    defaultSrc: ["'self'"],
                    'default-src': ['cdn.example.com']
                }
            });
            const occurrences = result.value.split('default-src').length - 1;
            expect(occurrences).to.equal(1);
        });

        it('first occurrence wins on a camelCase + kebab collision', () => {

            const result = Csp({
                useDefaults: false,
                directives: {
                    defaultSrc: ["'self'"],
                    'default-src': ['cdn.example.com']
                }
            });
            expect(result.value).to.equal("default-src 'self'");
        });
    });

    describe('unit — resolveDirectives (function values)', () => {

        const { resolveDirectives } = Csp;

        it('passes static string and string[] values through unchanged', () => {

            const input = { defaultSrc: ["'self'"], scriptSrc: "'self'" };
            const out = resolveDirectives(input, {});
            expect(out.defaultSrc).to.equal(["'self'"]);
            expect(out.scriptSrc).to.equal("'self'");
        });

        it('invokes a function-valued directive with the request and uses its string return', () => {

            const request = { app: { nonce: 'abc' } };
            const out = resolveDirectives({
                scriptSrc: (req) => `'nonce-${req.app.nonce}'`
            }, request);
            expect(out.scriptSrc).to.equal("'nonce-abc'");
        });

        it('uses a function return of string[] as the directive array', () => {

            const out = resolveDirectives({
                scriptSrc: () => ["'self'", 'cdn.example.com']
            }, {});
            expect(out.scriptSrc).to.equal(["'self'", 'cdn.example.com']);
        });

        it('flattens functions inside a mixed array', () => {

            const request = { app: { nonce: 'xyz' } };
            const out = resolveDirectives({
                scriptSrc: ["'self'", (req) => `'nonce-${req.app.nonce}'`, () => ['https://cdn.example.com', 'https://cdn2.example.com']]
            }, request);
            expect(out.scriptSrc).to.equal(["'self'", "'nonce-xyz'", 'https://cdn.example.com', 'https://cdn2.example.com']);
        });

        it('passes the exact request object to functions', () => {

            const request = { app: {} };
            let captured;
            resolveDirectives({ scriptSrc: (req) => {

                captured = req;
                return "'self'";
            } }, request);
            expect(captured).to.shallow.equal(request);
        });

        it('drops array items whose function returns null or undefined', () => {

            const out = resolveDirectives({
                scriptSrc: ["'self'", () => undefined, () => null, 'cdn.example.com']
            }, {});
            expect(out.scriptSrc).to.equal(["'self'", 'cdn.example.com']);
        });

        it('drops array items that are bare null or undefined', () => {

            const out = resolveDirectives({
                scriptSrc: ["'self'", null, undefined, 'cdn.example.com']
            }, {});
            expect(out.scriptSrc).to.equal(["'self'", 'cdn.example.com']);
        });

        it('preserves a top-level function return of undefined so the middleware skips the directive', () => {

            const out = resolveDirectives({
                scriptSrc: () => undefined
            }, {});
            expect(out.scriptSrc).to.be.undefined();
        });

        it('passes through explicit null / undefined directive values', () => {

            const out = resolveDirectives({ scriptSrc: null, styleSrc: undefined }, {});
            expect(out.scriptSrc).to.be.null();
            expect(out.styleSrc).to.be.undefined();
        });

        it('throws a descriptive error when a top-level function returns a non-string, non-array value', () => {

            expect(() => resolveDirectives({ scriptSrc: () => 42 }, {})).to.throw(
                'hapi-aegis: contentSecurityPolicy directive "script-src" function returned invalid value; expected string or string[]'
            );
        });

        it('throws when a function returns an array containing non-strings', () => {

            expect(() => resolveDirectives({ scriptSrc: () => ['ok', 42] }, {})).to.throw(
                /hapi-aegis: contentSecurityPolicy directive "script-src" function returned invalid value/
            );
        });

        it('throws when an array-embedded function returns a non-string, non-array value', () => {

            expect(() => resolveDirectives({ scriptSrc: ["'self'", () => ({ bad: true })] }, {})).to.throw(
                /hapi-aegis: contentSecurityPolicy directive "script-src" function returned invalid value/
            );
        });

        it('names the kebab directive in the error, not the camelCase input', () => {

            expect(() => resolveDirectives({ scriptSrcAttr: () => 42 }, {})).to.throw(
                /"script-src-attr"/
            );
        });
    });

    describe('integration', () => {

        it('sets the default Content-Security-Policy header on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['content-security-policy']).to.equal(DEFAULT_VALUE);
        });

        it('sets the header on Boom error responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({
                method: 'GET',
                path: '/boom',
                handler: () => {

                    throw new Error('intentional');
                }
            });

            const res = await server.inject('/boom');
            expect(res.statusCode).to.equal(500);
            expect(res.headers['content-security-policy']).to.equal(DEFAULT_VALUE);
        });

        it('uses the report-only header name when reportOnly: true', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { contentSecurityPolicy: { reportOnly: true } }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['content-security-policy-report-only']).to.equal(DEFAULT_VALUE);
            expect(res.headers['content-security-policy']).to.not.exist();
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { contentSecurityPolicy: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['content-security-policy']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { contentSecurityPolicy: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['content-security-policy']).to.not.exist();
            expect(onRes.headers['content-security-policy']).to.equal(DEFAULT_VALUE);
        });

        it('resolves a function-valued directive using request.app at response time', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        directives: {
                            scriptSrc: ["'self'", (req) => `'nonce-${req.app.nonce}'`]
                        }
                    }
                }
            });
            server.ext('onRequest', (request, h) => {

                request.app.nonce = 'req-nonce';
                return h.continue;
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['content-security-policy']).to.contain("script-src 'self' 'nonce-req-nonce'");
        });

        it('resolves function directives on Boom error responses too', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        directives: {
                            scriptSrc: ["'self'", (req) => `'nonce-${req.app.nonce}'`]
                        }
                    }
                }
            });
            server.ext('onRequest', (request, h) => {

                request.app.nonce = 'boom-nonce';
                return h.continue;
            });
            server.route({
                method: 'GET',
                path: '/boom',
                handler: () => {

                    throw new Error('intentional');
                }
            });

            const res = await server.inject('/boom');
            expect(res.statusCode).to.equal(500);
            expect(res.headers['content-security-policy']).to.contain("script-src 'self' 'nonce-boom-nonce'");
        });

        it('resolves functions inside reportOnly mode', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        reportOnly: true,
                        directives: {
                            scriptSrc: [() => "'nonce-abc'"]
                        }
                    }
                }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['content-security-policy-report-only']).to.contain("script-src 'nonce-abc'");
            expect(res.headers['content-security-policy']).to.not.exist();
        });

        it('applies the unquoted-keyword warning to resolved function values', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        useDefaults: false,
                        directives: { scriptSrc: [() => 'self'] }
                    }
                }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const warnings = [];
            const original = console.warn;
            console.warn = (msg) => warnings.push(msg);
            try {
                const res = await server.inject('/');
                expect(res.headers['content-security-policy']).to.equal('script-src self');
            }
            finally {
                console.warn = original;
            }

            expect(warnings.some((w) => w.includes('"self"') && w.includes('script-src'))).to.be.true();
        });

        it('surfaces function-return errors as 500s', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        directives: { scriptSrc: () => 42 }
                    }
                }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(500);
        });
    });

    describe('integration — generateNonces', () => {

        const NONCE_PATTERN = /'nonce-([A-Za-z0-9+/=]+)'/;

        it('appends an auto-generated nonce to script-src and style-src', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { contentSecurityPolicy: { generateNonces: true } }
            });
            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => ({ nonce: request.plugins.aegis.nonce })
            });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);

            const header = res.headers['content-security-policy'];
            const match = header.match(NONCE_PATTERN);
            expect(match).to.exist();
            const nonce = match[1];

            expect(header).to.contain(`script-src 'self' 'nonce-${nonce}'`);
            expect(header).to.contain(`style-src 'self' https: 'unsafe-inline' 'nonce-${nonce}'`);
            expect(res.result).to.equal({ nonce });
        });

        it('generates a fresh nonce for each request', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { contentSecurityPolicy: { generateNonces: true } }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const first = await server.inject('/');
            const second = await server.inject('/');

            const firstNonce = first.headers['content-security-policy'].match(NONCE_PATTERN)[1];
            const secondNonce = second.headers['content-security-policy'].match(NONCE_PATTERN)[1];

            expect(firstNonce).to.not.equal(secondNonce);
        });

        it('emits the nonce on Boom error responses', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { contentSecurityPolicy: { generateNonces: true } }
            });
            server.route({
                method: 'GET',
                path: '/boom',
                handler: () => {

                    throw new Error('intentional');
                }
            });

            const res = await server.inject('/boom');
            expect(res.statusCode).to.equal(500);
            expect(res.headers['content-security-policy']).to.match(NONCE_PATTERN);
        });

        it('creates the directives from scratch when useDefaults is false and no directives are supplied', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        useDefaults: false,
                        generateNonces: true
                    }
                }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            const header = res.headers['content-security-policy'];
            const nonce = header.match(NONCE_PATTERN)[1];

            expect(header).to.equal(`script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'`);
        });

        it('emits the nonce under reportOnly', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        reportOnly: true,
                        generateNonces: true
                    }
                }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['content-security-policy']).to.not.exist();
            expect(res.headers['content-security-policy-report-only']).to.match(NONCE_PATTERN);
        });

        it('appends the nonce after function-valued entries resolve', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    contentSecurityPolicy: {
                        generateNonces: true,
                        directives: {
                            scriptSrc: ["'self'", (req) => `https://cdn.example/${req.headers['x-tenant']}`]
                        }
                    }
                }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject({ method: 'GET', url: '/', headers: { 'x-tenant': 'acme' } });
            const header = res.headers['content-security-policy'];
            const nonce = header.match(NONCE_PATTERN)[1];

            expect(header).to.contain(`script-src 'self' https://cdn.example/acme 'nonce-${nonce}'`);
        });

        it('honors a route-level generateNonces: false override', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { contentSecurityPolicy: { generateNonces: true } }
            });
            server.route({
                method: 'GET',
                path: '/public',
                options: {
                    plugins: {
                        aegis: { contentSecurityPolicy: { generateNonces: false } }
                    }
                },
                handler: (request) => ({ nonce: request.plugins.aegis && request.plugins.aegis.nonce })
            });
            server.route({
                method: 'GET',
                path: '/private',
                handler: (request) => ({ nonce: request.plugins.aegis.nonce })
            });

            const publicRes = await server.inject('/public');
            const privateRes = await server.inject('/private');

            expect(publicRes.headers['content-security-policy']).to.not.match(NONCE_PATTERN);
            expect(publicRes.result).to.equal({ nonce: undefined });

            expect(privateRes.headers['content-security-policy']).to.match(NONCE_PATTERN);
            expect(privateRes.result.nonce).to.be.a.string();
        });

        it('honors a route-level generateNonces: true when the server default is off', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis });
            server.route({
                method: 'GET',
                path: '/nonced',
                options: {
                    plugins: {
                        aegis: { contentSecurityPolicy: { generateNonces: true } }
                    }
                },
                handler: (request) => ({ nonce: request.plugins.aegis.nonce })
            });
            server.route({ method: 'GET', path: '/plain', handler: () => 'ok' });

            const noncedRes = await server.inject('/nonced');
            const plainRes = await server.inject('/plain');

            expect(noncedRes.headers['content-security-policy']).to.match(NONCE_PATTERN);
            expect(noncedRes.result.nonce).to.be.a.string();

            expect(plainRes.headers['content-security-policy']).to.not.match(NONCE_PATTERN);
        });

        it('does not set request.plugins.aegis when generateNonces is off', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis });
            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => ({ aegis: request.plugins.aegis })
            });

            const res = await server.inject('/');
            expect(res.headers['content-security-policy']).to.not.match(NONCE_PATTERN);
            expect(res.result).to.equal({ aegis: undefined });
        });
    });
});
