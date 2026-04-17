'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const DnsPrefetchControl = require('../../lib/middlewares/dnsPrefetchControl');

const { describe, it } = exports.lab = Lab.script();

describe('dnsPrefetchControl middleware', () => {

    describe('unit', () => {

        it('defaults to off when no options are provided', () => {

            expect(DnsPrefetchControl()).to.equal({ header: 'X-DNS-Prefetch-Control', value: 'off' });
        });

        it('defaults to off with an empty options object', () => {

            expect(DnsPrefetchControl({})).to.equal({ header: 'X-DNS-Prefetch-Control', value: 'off' });
        });

        it('returns on when allow is true', () => {

            expect(DnsPrefetchControl({ allow: true })).to.equal({ header: 'X-DNS-Prefetch-Control', value: 'on' });
        });

        it('returns off when allow is false', () => {

            expect(DnsPrefetchControl({ allow: false })).to.equal({ header: 'X-DNS-Prefetch-Control', value: 'off' });
        });
    });

    describe('integration', () => {

        it('sets X-DNS-Prefetch-Control: off by default on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['x-dns-prefetch-control']).to.equal('off');
        });

        it('sets X-DNS-Prefetch-Control: on when server-level allow is true', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { dnsPrefetchControl: { allow: true } } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['x-dns-prefetch-control']).to.equal('on');
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
            expect(res.headers['x-dns-prefetch-control']).to.equal('off');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { dnsPrefetchControl: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['x-dns-prefetch-control']).to.not.exist();
        });

        it('route-level override flips off to on for a single route', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/on',
                options: { plugins: { aegis: { dnsPrefetchControl: { allow: true } } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/default', handler: () => 'ok' });

            const onRes = await server.inject('/on');
            const defaultRes = await server.inject('/default');

            expect(onRes.headers['x-dns-prefetch-control']).to.equal('on');
            expect(defaultRes.headers['x-dns-prefetch-control']).to.equal('off');
        });
    });
});
