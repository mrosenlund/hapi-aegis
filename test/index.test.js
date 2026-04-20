'use strict';

const Fs = require('fs');
const Path = require('path');

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('..');
const { applyHeader, resolveConfig, loadMiddlewares } = Aegis.internals;

const { describe, it } = exports.lab = Lab.script();

const MIDDLEWARES_DIR = Path.join(__dirname, '..', 'lib', 'middlewares');

describe('hapi-aegis plugin shell', () => {

    it('registers without error', async () => {

        const server = Hapi.server();
        await server.register(Aegis);
        expect(server.registrations['hapi-aegis']).to.exist();
    });

    it('reports plugin version from package.json', () => {

        expect(Aegis.plugin.version).to.equal(require('../package.json').version);
    });

    it('applies all default middlewares on a 200 response', async () => {

        const server = Hapi.server();
        await server.register(Aegis);

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, h) => h.response('ok')
                .header('X-Powered-By', 'leaky')
                .header('Server', 'leaky')
        });

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-content-type-options']).to.equal('nosniff');
        expect(res.headers['x-xss-protection']).to.equal('0');
        expect(res.headers['x-powered-by']).to.not.exist();
        expect(res.headers['server']).to.not.exist();
    });

    it('applies all default middlewares on a Boom error response', async () => {

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
        expect(res.headers['x-content-type-options']).to.equal('nosniff');
        expect(res.headers['x-xss-protection']).to.equal('0');
    });

    it('route-level plugins.aegis overrides server-level disabling', async () => {

        const server = Hapi.server();
        await server.register({ plugin: Aegis, options: { noSniff: false } });

        server.route({
            method: 'GET',
            path: '/route-on',
            options: { plugins: { aegis: { noSniff: {} } } },
            handler: () => 'ok'
        });
        server.route({ method: 'GET', path: '/server-off', handler: () => 'ok' });

        const onRes = await server.inject('/route-on');
        const offRes = await server.inject('/server-off');

        expect(onRes.headers['x-content-type-options']).to.equal('nosniff');
        expect(offRes.headers['x-content-type-options']).to.not.exist();
    });

    it('does not crash when the plugin is registered with no options', async () => {

        const server = Hapi.server();
        await server.register(Aegis);
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });
        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
    });
});

describe('Default registration', () => {

    const DEFAULT_CSP = [
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

    it('applies every default security header on a 200 response', async () => {

        const server = Hapi.server();
        await server.register(Aegis);

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, h) => h.response('ok')
                .header('X-Powered-By', 'leaky')
                .header('Server', 'leaky')
        });

        const res = await server.inject('/');

        expect(res.statusCode).to.equal(200);
        expect(res.headers['content-security-policy']).to.equal(DEFAULT_CSP);
        expect(res.headers['cross-origin-embedder-policy']).to.equal('require-corp');
        expect(res.headers['cross-origin-opener-policy']).to.equal('same-origin');
        expect(res.headers['cross-origin-resource-policy']).to.equal('same-origin');
        expect(res.headers['x-dns-prefetch-control']).to.equal('off');
        expect(res.headers['expect-ct']).to.equal('max-age=0');
        expect(res.headers['x-frame-options']).to.equal('SAMEORIGIN');
        expect(res.headers['strict-transport-security']).to.equal('max-age=15552000; includeSubDomains');
        expect(res.headers['x-download-options']).to.equal('noopen');
        expect(res.headers['x-content-type-options']).to.equal('nosniff');
        expect(res.headers['origin-agent-cluster']).to.equal('?1');
        expect(res.headers['x-permitted-cross-domain-policies']).to.equal('none');
        expect(res.headers['referrer-policy']).to.equal('no-referrer');
        expect(res.headers['x-xss-protection']).to.equal('0');
        expect(res.headers['x-powered-by']).to.not.exist();
        expect(res.headers['server']).to.not.exist();
    });
});

describe('Disabling individual middlewares', () => {

    it('omits disabled headers and keeps all others at defaults', async () => {

        const server = Hapi.server();
        await server.register({ plugin: Aegis, options: { xssFilter: false, frameguard: false } });
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');

        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-xss-protection']).to.not.exist();
        expect(res.headers['x-frame-options']).to.not.exist();

        expect(res.headers['x-content-type-options']).to.equal('nosniff');
        expect(res.headers['strict-transport-security']).to.equal('max-age=15552000; includeSubDomains');
        expect(res.headers['referrer-policy']).to.equal('no-referrer');
        expect(res.headers['cross-origin-opener-policy']).to.equal('same-origin');
        expect(res.headers['cross-origin-resource-policy']).to.equal('same-origin');
        expect(res.headers['cross-origin-embedder-policy']).to.equal('require-corp');
        expect(res.headers['x-dns-prefetch-control']).to.equal('off');
        expect(res.headers['expect-ct']).to.equal('max-age=0');
        expect(res.headers['x-download-options']).to.equal('noopen');
        expect(res.headers['origin-agent-cluster']).to.equal('?1');
        expect(res.headers['x-permitted-cross-domain-policies']).to.equal('none');
        expect(res.headers['content-security-policy']).to.startWith("default-src 'self'");
    });
});

describe('Custom options', () => {

    it('emits the user-supplied values in the response headers', async () => {

        const server = Hapi.server();
        await server.register({
            plugin: Aegis,
            options: {
                hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
                contentSecurityPolicy: { directives: { scriptSrc: ["'self'", "'unsafe-inline'"] } },
                frameguard: { action: 'deny' }
            }
        });
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');

        expect(res.statusCode).to.equal(200);
        expect(res.headers['strict-transport-security']).to.equal('max-age=63072000; includeSubDomains; preload');
        expect(res.headers['x-frame-options']).to.equal('DENY');

        const csp = res.headers['content-security-policy'];
        expect(csp).to.contain("script-src 'self' 'unsafe-inline'");
        expect(csp).to.contain("default-src 'self'");
        expect(csp).to.not.contain("script-src 'self';");
    });
});

describe('Route-level overrides', () => {

    it('applies server defaults on un-overridden routes and route overrides on overridden routes', async () => {

        const server = Hapi.server();
        await server.register(Aegis);

        server.route({ method: 'GET', path: '/a', handler: () => 'ok' });
        server.route({
            method: 'GET',
            path: '/b',
            options: {
                plugins: {
                    aegis: {
                        contentSecurityPolicy: false,
                        frameguard: { action: 'deny' }
                    }
                }
            },
            handler: () => 'ok'
        });

        const a = await server.inject('/a');
        const b = await server.inject('/b');

        expect(a.headers['content-security-policy']).to.startWith("default-src 'self'");
        expect(a.headers['x-frame-options']).to.equal('SAMEORIGIN');
        expect(a.headers['x-content-type-options']).to.equal('nosniff');

        expect(b.headers['content-security-policy']).to.not.exist();
        expect(b.headers['x-frame-options']).to.equal('DENY');
        expect(b.headers['x-content-type-options']).to.equal('nosniff');
    });
});

describe('internals', () => {

    describe('loadMiddlewares()', () => {

        it('returns an array of { name, run } entries for each .js file', () => {

            const middlewares = loadMiddlewares();
            expect(middlewares).to.be.an.array();
            expect(middlewares.length).to.be.at.least(3);
            for (const m of middlewares) {
                expect(m.name).to.be.a.string();
                expect(m.run).to.be.a.function();
            }
        });

        it('returns an empty array when the middlewares directory is missing', () => {

            const backup = MIDDLEWARES_DIR + '.bak';
            Fs.renameSync(MIDDLEWARES_DIR, backup);
            try {
                expect(loadMiddlewares()).to.equal([]);
            }
            finally {
                Fs.renameSync(backup, MIDDLEWARES_DIR);
            }
        });
    });

    describe('resolveConfig()', () => {

        it('returns the route-level value when present', () => {

            expect(resolveConfig('x', { x: 'server' }, { x: 'route' })).to.equal('route');
        });

        it('falls back to the server-level value when no route override', () => {

            expect(resolveConfig('x', { x: 'server' }, {})).to.equal('server');
        });

        it('treats false at the route level as an explicit value (not fallthrough)', () => {

            expect(resolveConfig('x', { x: 'server' }, { x: false })).to.equal(false);
        });

        it('returns undefined when neither level has the key', () => {

            expect(resolveConfig('x', {}, {})).to.be.undefined();
        });
    });

    describe('applyHeader()', () => {

        it('is a no-op when result is null', () => {

            const response = { header() {} };
            expect(() => applyHeader(response, null)).to.not.throw();
        });

        it('is a no-op when result has no header property', () => {

            const response = { header() {} };
            expect(() => applyHeader(response, { value: 'x' })).to.not.throw();
        });

        it('tolerates a missing response.headers during remove on a normal response', () => {

            const response = { isBoom: false, headers: undefined, header() {} };
            expect(() => applyHeader(response, { action: 'remove', header: 'X-Anything' })).to.not.throw();
        });
    });
});
