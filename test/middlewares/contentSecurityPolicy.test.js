'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const Csp = require('../../lib/middlewares/contentSecurityPolicy');

const { describe, it } = exports.lab = Lab.script();

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
    });
});
