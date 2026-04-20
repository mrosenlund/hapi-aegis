'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const Coop = require('../../lib/middlewares/crossOriginOpenerPolicy');

const { describe, it } = exports.lab = Lab.script();

describe('crossOriginOpenerPolicy middleware', () => {

    describe('unit', () => {

        it('defaults to same-origin when no options are provided', () => {

            expect(Coop()).to.equal({ header: 'Cross-Origin-Opener-Policy', value: 'same-origin' });
        });

        it('defaults to same-origin when options has no policy', () => {

            expect(Coop({})).to.equal({ header: 'Cross-Origin-Opener-Policy', value: 'same-origin' });
        });

        it('returns same-origin when policy is "same-origin"', () => {

            expect(Coop({ policy: 'same-origin' })).to.equal({ header: 'Cross-Origin-Opener-Policy', value: 'same-origin' });
        });

        it('returns same-origin-allow-popups when policy is "same-origin-allow-popups"', () => {

            expect(Coop({ policy: 'same-origin-allow-popups' })).to.equal({ header: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' });
        });

        it('returns unsafe-none when policy is "unsafe-none"', () => {

            expect(Coop({ policy: 'unsafe-none' })).to.equal({ header: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' });
        });

        it('falls back to default when policy is null or empty', () => {

            expect(Coop({ policy: null })).to.equal({ header: 'Cross-Origin-Opener-Policy', value: 'same-origin' });
            expect(Coop({ policy: '' })).to.equal({ header: 'Cross-Origin-Opener-Policy', value: 'same-origin' });
        });

        it('throws on an unknown policy with a hapi-aegis-prefixed message', () => {

            expect(() => Coop({ policy: 'bogus' })).to.throw('hapi-aegis: crossOriginOpenerPolicy policy "bogus" is not one of: same-origin, same-origin-allow-popups, unsafe-none');
        });

        it('throws on uppercase input (strict lowercase contract)', () => {

            expect(() => Coop({ policy: 'SAME-ORIGIN' })).to.throw('hapi-aegis: crossOriginOpenerPolicy policy "SAME-ORIGIN" is not one of: same-origin, same-origin-allow-popups, unsafe-none');
        });
    });

    describe('integration', () => {

        it('sets Cross-Origin-Opener-Policy: same-origin by default on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['cross-origin-opener-policy']).to.equal('same-origin');
        });

        it('sets the configured policy when server-level options are provided', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' } } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['cross-origin-opener-policy']).to.equal('same-origin-allow-popups');
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
            expect(res.headers['cross-origin-opener-policy']).to.equal('same-origin');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { crossOriginOpenerPolicy: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['cross-origin-opener-policy']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { crossOriginOpenerPolicy: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['cross-origin-opener-policy']).to.not.exist();
            expect(onRes.headers['cross-origin-opener-policy']).to.equal('same-origin');
        });
    });
});
