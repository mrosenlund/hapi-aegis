'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const Corp = require('../../lib/middlewares/crossOriginResourcePolicy');

const { describe, it } = exports.lab = Lab.script();

describe('crossOriginResourcePolicy middleware', () => {

    describe('unit', () => {

        it('defaults to same-origin when no options are provided', () => {

            expect(Corp()).to.equal({ header: 'Cross-Origin-Resource-Policy', value: 'same-origin' });
        });

        it('defaults to same-origin when options has no policy', () => {

            expect(Corp({})).to.equal({ header: 'Cross-Origin-Resource-Policy', value: 'same-origin' });
        });

        it('returns same-origin when policy is "same-origin"', () => {

            expect(Corp({ policy: 'same-origin' })).to.equal({ header: 'Cross-Origin-Resource-Policy', value: 'same-origin' });
        });

        it('returns same-site when policy is "same-site"', () => {

            expect(Corp({ policy: 'same-site' })).to.equal({ header: 'Cross-Origin-Resource-Policy', value: 'same-site' });
        });

        it('returns cross-origin when policy is "cross-origin"', () => {

            expect(Corp({ policy: 'cross-origin' })).to.equal({ header: 'Cross-Origin-Resource-Policy', value: 'cross-origin' });
        });

        it('falls back to default when policy is null or empty', () => {

            expect(Corp({ policy: null })).to.equal({ header: 'Cross-Origin-Resource-Policy', value: 'same-origin' });
            expect(Corp({ policy: '' })).to.equal({ header: 'Cross-Origin-Resource-Policy', value: 'same-origin' });
        });

        it('throws on an unknown policy with a hapi-aegis-prefixed message', () => {

            expect(() => Corp({ policy: 'bogus' })).to.throw('hapi-aegis: crossOriginResourcePolicy policy "bogus" is not one of: same-origin, same-site, cross-origin');
        });

        it('throws on uppercase input (strict lowercase contract)', () => {

            expect(() => Corp({ policy: 'SAME-ORIGIN' })).to.throw('hapi-aegis: crossOriginResourcePolicy policy "SAME-ORIGIN" is not one of: same-origin, same-site, cross-origin');
        });
    });

    describe('integration', () => {

        it('sets Cross-Origin-Resource-Policy: same-origin by default on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['cross-origin-resource-policy']).to.equal('same-origin');
        });

        it('sets the configured policy when server-level options are provided', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { crossOriginResourcePolicy: { policy: 'cross-origin' } } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['cross-origin-resource-policy']).to.equal('cross-origin');
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
            expect(res.headers['cross-origin-resource-policy']).to.equal('same-origin');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { crossOriginResourcePolicy: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['cross-origin-resource-policy']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { crossOriginResourcePolicy: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['cross-origin-resource-policy']).to.not.exist();
            expect(onRes.headers['cross-origin-resource-policy']).to.equal('same-origin');
        });
    });
});
