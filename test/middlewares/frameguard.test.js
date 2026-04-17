'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const Frameguard = require('../../lib/middlewares/frameguard');

const { describe, it } = exports.lab = Lab.script();

describe('frameguard middleware', () => {

    describe('unit', () => {

        it('defaults to SAMEORIGIN when no options are provided', () => {

            expect(Frameguard()).to.equal({ header: 'X-Frame-Options', value: 'SAMEORIGIN' });
        });

        it('defaults to SAMEORIGIN when options has no action', () => {

            expect(Frameguard({})).to.equal({ header: 'X-Frame-Options', value: 'SAMEORIGIN' });
        });

        it('returns DENY when action is "deny"', () => {

            expect(Frameguard({ action: 'deny' })).to.equal({ header: 'X-Frame-Options', value: 'DENY' });
        });

        it('returns SAMEORIGIN when action is "sameorigin"', () => {

            expect(Frameguard({ action: 'sameorigin' })).to.equal({ header: 'X-Frame-Options', value: 'SAMEORIGIN' });
        });

        it('falls back to default when action is null or empty', () => {

            expect(Frameguard({ action: null })).to.equal({ header: 'X-Frame-Options', value: 'SAMEORIGIN' });
            expect(Frameguard({ action: '' })).to.equal({ header: 'X-Frame-Options', value: 'SAMEORIGIN' });
        });

        it('throws on an unknown action with a hapi-aegis-prefixed message', () => {

            expect(() => Frameguard({ action: 'allow-from' })).to.throw('hapi-aegis: frameguard action must be "deny" or "sameorigin"');
        });

        it('throws on uppercase input (strict lowercase contract)', () => {

            expect(() => Frameguard({ action: 'DENY' })).to.throw('hapi-aegis: frameguard action must be "deny" or "sameorigin"');
        });
    });

    describe('integration', () => {

        it('sets X-Frame-Options: SAMEORIGIN by default on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['x-frame-options']).to.equal('SAMEORIGIN');
        });

        it('sets X-Frame-Options: DENY when server-level action is "deny"', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { frameguard: { action: 'deny' } } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['x-frame-options']).to.equal('DENY');
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
            expect(res.headers['x-frame-options']).to.equal('SAMEORIGIN');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { frameguard: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['x-frame-options']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { frameguard: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['x-frame-options']).to.not.exist();
            expect(onRes.headers['x-frame-options']).to.equal('SAMEORIGIN');
        });
    });
});
