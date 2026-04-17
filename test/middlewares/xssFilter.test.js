'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const XssFilter = require('../../lib/middlewares/xssFilter');

const { describe, it } = exports.lab = Lab.script();

describe('xssFilter middleware', () => {

    it('returns { header: X-XSS-Protection, value: 0 }', () => {

        expect(XssFilter()).to.equal({ header: 'X-XSS-Protection', value: '0' });
    });

    it('takes no options', () => {

        expect(XssFilter()).to.equal(XssFilter({ anything: true }));
    });

    it('sets the header on 200 responses', async () => {

        const server = Hapi.server();
        await server.register(Aegis);
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-xss-protection']).to.equal('0');
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
        expect(res.headers['x-xss-protection']).to.equal('0');
    });

    it('can be disabled via server-level options', async () => {

        const server = Hapi.server();
        await server.register({ plugin: Aegis, options: { xssFilter: false } });
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');
        expect(res.headers['x-xss-protection']).to.not.exist();
    });

    it('can be disabled on a single route via plugins.aegis config', async () => {

        const server = Hapi.server();
        await server.register(Aegis);

        server.route({
            method: 'GET',
            path: '/off',
            options: { plugins: { aegis: { xssFilter: false } } },
            handler: () => 'ok'
        });
        server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

        const offRes = await server.inject('/off');
        const onRes = await server.inject('/on');

        expect(offRes.headers['x-xss-protection']).to.not.exist();
        expect(onRes.headers['x-xss-protection']).to.equal('0');
    });
});
