'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const IeNoOpen = require('../../lib/middlewares/ieNoOpen');

const { describe, it } = exports.lab = Lab.script();

describe('ieNoOpen middleware', () => {

    it('returns { header: X-Download-Options, value: noopen }', () => {

        expect(IeNoOpen()).to.equal({ header: 'X-Download-Options', value: 'noopen' });
    });

    it('takes no options', () => {

        expect(IeNoOpen()).to.equal(IeNoOpen({ anything: true }));
    });

    it('sets the header on 200 responses', async () => {

        const server = Hapi.server();
        await server.register(Aegis);
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-download-options']).to.equal('noopen');
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
        expect(res.headers['x-download-options']).to.equal('noopen');
    });

    it('can be disabled via server-level options', async () => {

        const server = Hapi.server();
        await server.register({ plugin: Aegis, options: { ieNoOpen: false } });
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');
        expect(res.headers['x-download-options']).to.not.exist();
    });

    it('can be disabled on a single route via plugins.aegis config', async () => {

        const server = Hapi.server();
        await server.register(Aegis);

        server.route({
            method: 'GET',
            path: '/off',
            options: { plugins: { aegis: { ieNoOpen: false } } },
            handler: () => 'ok'
        });
        server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

        const offRes = await server.inject('/off');
        const onRes = await server.inject('/on');

        expect(offRes.headers['x-download-options']).to.not.exist();
        expect(onRes.headers['x-download-options']).to.equal('noopen');
    });
});
