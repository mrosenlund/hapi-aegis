'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Fs = require('fs');
const Path = require('path');

const Aegis = require('..');
const { registryKey, applyHeader, resolveConfig, loadMiddlewares } = Aegis.internals;

const { describe, it } = exports.lab = Lab.script();

const MIDDLEWARES_DIR = Path.join(__dirname, '..', 'lib', 'middlewares');

const makeSetter = (name, header, defaultValue) => ({
    name,
    run(options) {

        const value = (options && options.value) || defaultValue;
        return { header, value };
    }
});

const makeRemover = (name, header) => ({
    name,
    run() {

        return { action: 'remove', header };
    }
});

const makeArrayRemover = (name, headers) => ({
    name,
    run() {

        return headers.map((h) => ({ action: 'remove', header: h }));
    }
});

const makeNoop = (name) => ({
    name,
    run() {

        return null;
    }
});

const makeEmptyReturn = (name) => ({
    name,
    run() {

        return {};
    }
});

const registerWith = async (server, registry, serverOptions = {}) => {

    await server.register({
        plugin: Aegis,
        options: Object.assign({ [registryKey]: registry }, serverOptions)
    });
};

describe('hapi-aegis plugin shell', () => {

    it('registers without error', async () => {

        const server = Hapi.server();
        await server.register(Aegis);
        expect(server.registrations['hapi-aegis']).to.exist();
    });

    it('applies middleware headers on 200 responses', async () => {

        const server = Hapi.server();
        await registerWith(server, [makeSetter('testSetter', 'X-Test-Setter', 'default-value')]);

        server.route({ method: 'GET', path: '/', handler: () => 'ok' });
        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-test-setter']).to.equal('default-value');
    });

    it('applies middleware headers on Boom error responses', async () => {

        const server = Hapi.server();
        await registerWith(server, [makeSetter('testSetter', 'X-Test-Setter', 'default-value')]);

        server.route({
            method: 'GET',
            path: '/boom',
            handler: () => {

                throw new Error('intentional');
            }
        });

        const res = await server.inject('/boom');
        expect(res.statusCode).to.equal(500);
        expect(res.headers['x-test-setter']).to.equal('default-value');
    });

    it('removes headers when middleware returns action=remove on 200 responses', async () => {

        const server = Hapi.server();
        await registerWith(server, [makeRemover('testRemover', 'X-Powered-By')]);

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, h) => h.response('ok').header('X-Powered-By', 'test')
        });

        const res = await server.inject('/');
        expect(res.headers['x-powered-by']).to.not.exist();
    });

    it('removes headers when middleware returns action=remove on Boom responses', async () => {

        const server = Hapi.server();
        await registerWith(server, [
            makeSetter('testSetter', 'X-Will-Be-Removed', 'set-value'),
            makeRemover('testRemover', 'X-Will-Be-Removed')
        ]);

        server.route({
            method: 'GET',
            path: '/boom',
            handler: () => {

                throw new Error('intentional');
            }
        });

        const res = await server.inject('/boom');
        expect(res.statusCode).to.equal(500);
        expect(res.headers['x-will-be-removed']).to.not.exist();
    });

    it('accepts server-level options configuring a middleware', async () => {

        const server = Hapi.server();
        await registerWith(
            server,
            [makeSetter('testSetter', 'X-Test-Setter', 'default-value')],
            { testSetter: { value: 'server-value' } }
        );

        server.route({ method: 'GET', path: '/', handler: () => 'ok' });
        const res = await server.inject('/');
        expect(res.headers['x-test-setter']).to.equal('server-value');
    });

    it('disables a middleware when server-level option is false', async () => {

        const server = Hapi.server();
        await registerWith(
            server,
            [makeSetter('testSetter', 'X-Test-Setter', 'default-value')],
            { testSetter: false }
        );

        server.route({ method: 'GET', path: '/', handler: () => 'ok' });
        const res = await server.inject('/');
        expect(res.headers['x-test-setter']).to.not.exist();
    });

    it('route-level plugins.aegis overrides server-level options', async () => {

        const server = Hapi.server();
        await registerWith(
            server,
            [makeSetter('testSetter', 'X-Test-Setter', 'default-value')],
            { testSetter: { value: 'server-value' } }
        );

        server.route({
            method: 'GET',
            path: '/override',
            options: {
                plugins: {
                    aegis: { testSetter: { value: 'route-value' } }
                }
            },
            handler: () => 'ok'
        });
        server.route({ method: 'GET', path: '/default', handler: () => 'ok' });

        const overrideRes = await server.inject('/override');
        const defaultRes = await server.inject('/default');

        expect(overrideRes.headers['x-test-setter']).to.equal('route-value');
        expect(defaultRes.headers['x-test-setter']).to.equal('server-value');
    });

    it('route-level false disables a middleware for that route only', async () => {

        const server = Hapi.server();
        await registerWith(
            server,
            [makeSetter('testSetter', 'X-Test-Setter', 'default-value')]
        );

        server.route({
            method: 'GET',
            path: '/off',
            options: {
                plugins: {
                    aegis: { testSetter: false }
                }
            },
            handler: () => 'ok'
        });
        server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

        const offRes = await server.inject('/off');
        const onRes = await server.inject('/on');

        expect(offRes.headers['x-test-setter']).to.not.exist();
        expect(onRes.headers['x-test-setter']).to.equal('default-value');
    });

    it('tolerates middleware returning null or a resultless object', async () => {

        const server = Hapi.server();
        await registerWith(server, [
            makeNoop('testNoop'),
            makeEmptyReturn('testEmpty')
        ]);

        server.route({ method: 'GET', path: '/', handler: () => 'ok' });
        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
    });

    it('applies each entry when a middleware returns an array of results', async () => {

        const server = Hapi.server();
        await registerWith(server, [makeArrayRemover('testMulti', ['X-Alpha', 'X-Beta'])]);

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, h) => h.response('ok')
                .header('X-Alpha', 'a')
                .header('X-Beta', 'b')
        });

        const res = await server.inject('/');
        expect(res.headers['x-alpha']).to.not.exist();
        expect(res.headers['x-beta']).to.not.exist();
    });

    it('reports plugin version from package.json', () => {

        expect(Aegis.plugin.version).to.equal(require('../package.json').version);
    });
});

describe('internals', () => {

    describe('loadMiddlewares()', () => {

        it('returns an empty array when the middlewares directory is empty', () => {

            expect(loadMiddlewares()).to.equal([]);
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
