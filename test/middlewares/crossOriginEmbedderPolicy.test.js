'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const Coep = require('../../lib/middlewares/crossOriginEmbedderPolicy');

const { describe, it } = exports.lab = Lab.script();

describe('crossOriginEmbedderPolicy middleware', () => {

    describe('unit', () => {

        it('defaults to require-corp when no options are provided', () => {

            expect(Coep()).to.equal({ header: 'Cross-Origin-Embedder-Policy', value: 'require-corp' });
        });

        it('defaults to require-corp when options has no policy', () => {

            expect(Coep({})).to.equal({ header: 'Cross-Origin-Embedder-Policy', value: 'require-corp' });
        });

        it('returns require-corp when policy is "require-corp"', () => {

            expect(Coep({ policy: 'require-corp' })).to.equal({ header: 'Cross-Origin-Embedder-Policy', value: 'require-corp' });
        });

        it('returns credentialless when policy is "credentialless"', () => {

            expect(Coep({ policy: 'credentialless' })).to.equal({ header: 'Cross-Origin-Embedder-Policy', value: 'credentialless' });
        });

        it('returns unsafe-none when policy is "unsafe-none"', () => {

            expect(Coep({ policy: 'unsafe-none' })).to.equal({ header: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' });
        });

        it('falls back to default when policy is null or empty', () => {

            expect(Coep({ policy: null })).to.equal({ header: 'Cross-Origin-Embedder-Policy', value: 'require-corp' });
            expect(Coep({ policy: '' })).to.equal({ header: 'Cross-Origin-Embedder-Policy', value: 'require-corp' });
        });

        it('throws on an unknown policy with a hapi-aegis-prefixed message', () => {

            expect(() => Coep({ policy: 'bogus' })).to.throw('hapi-aegis: crossOriginEmbedderPolicy policy "bogus" is not one of: require-corp, credentialless, unsafe-none');
        });

        it('throws on uppercase input (strict lowercase contract)', () => {

            expect(() => Coep({ policy: 'REQUIRE-CORP' })).to.throw('hapi-aegis: crossOriginEmbedderPolicy policy "REQUIRE-CORP" is not one of: require-corp, credentialless, unsafe-none');
        });
    });

    describe('integration', () => {

        it('sets Cross-Origin-Embedder-Policy: require-corp by default on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['cross-origin-embedder-policy']).to.equal('require-corp');
        });

        it('sets the configured policy when server-level options are provided', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { crossOriginEmbedderPolicy: { policy: 'credentialless' } } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['cross-origin-embedder-policy']).to.equal('credentialless');
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
            expect(res.headers['cross-origin-embedder-policy']).to.equal('require-corp');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { crossOriginEmbedderPolicy: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['cross-origin-embedder-policy']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { crossOriginEmbedderPolicy: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['cross-origin-embedder-policy']).to.not.exist();
            expect(onRes.headers['cross-origin-embedder-policy']).to.equal('require-corp');
        });
    });
});
