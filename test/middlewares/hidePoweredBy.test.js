'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const HidePoweredBy = require('../../lib/middlewares/hidePoweredBy');

const { describe, it } = exports.lab = Lab.script();

const addLeakyHeadersRoute = (server) => {

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => h.response('ok')
            .header('X-Powered-By', 'leaky')
            .header('Server', 'leaky')
    });
};

describe('hidePoweredBy middleware', () => {

    it('returns remove-actions for X-Powered-By and Server', () => {

        const result = HidePoweredBy();
        expect(result).to.equal([
            { action: 'remove', header: 'X-Powered-By' },
            { action: 'remove', header: 'Server' }
        ]);
    });

    it('takes no options (result is independent of input)', () => {

        expect(HidePoweredBy()).to.equal(HidePoweredBy({ anything: true }));
    });

    it('removes both headers from 200 responses', async () => {

        const server = Hapi.server();
        await server.register(Aegis);
        addLeakyHeadersRoute(server);

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-powered-by']).to.not.exist();
        expect(res.headers['server']).to.not.exist();
    });

    it('removes both headers from Boom error responses', async () => {

        const server = Hapi.server();

        server.ext('onPreResponse', (request, h) => {

            if (request.response.isBoom) {
                request.response.output.headers['X-Powered-By'] = 'leaky';
                request.response.output.headers['Server'] = 'leaky';
            }
            return h.continue;
        });

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
        expect(res.headers['x-powered-by']).to.not.exist();
        expect(res.headers['server']).to.not.exist();
    });

    it('can be disabled via server-level options', async () => {

        const server = Hapi.server();
        await server.register({ plugin: Aegis, options: { hidePoweredBy: false } });
        addLeakyHeadersRoute(server);

        const res = await server.inject('/');
        expect(res.headers['x-powered-by']).to.equal('leaky');
        expect(res.headers['server']).to.equal('leaky');
    });

    it('can be disabled on a single route via plugins.aegis config', async () => {

        const server = Hapi.server();
        await server.register(Aegis);

        server.route({
            method: 'GET',
            path: '/off',
            options: { plugins: { aegis: { hidePoweredBy: false } } },
            handler: (request, h) => h.response('ok').header('X-Powered-By', 'leaky')
        });
        server.route({
            method: 'GET',
            path: '/on',
            handler: (request, h) => h.response('ok').header('X-Powered-By', 'leaky')
        });

        const offRes = await server.inject('/off');
        const onRes = await server.inject('/on');

        expect(offRes.headers['x-powered-by']).to.equal('leaky');
        expect(onRes.headers['x-powered-by']).to.not.exist();
    });
});
