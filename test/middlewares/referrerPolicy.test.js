'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const ReferrerPolicy = require('../../lib/middlewares/referrerPolicy');

const { describe, it } = exports.lab = Lab.script();

const KNOWN = [
    'no-referrer',
    'no-referrer-when-downgrade',
    'origin',
    'origin-when-cross-origin',
    'same-origin',
    'strict-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
];

describe('referrerPolicy middleware', () => {

    describe('unit — single string', () => {

        it('defaults to no-referrer when no options are provided', () => {

            expect(ReferrerPolicy()).to.equal({ header: 'Referrer-Policy', value: 'no-referrer' });
        });

        it('defaults to no-referrer with an empty options object', () => {

            expect(ReferrerPolicy({})).to.equal({ header: 'Referrer-Policy', value: 'no-referrer' });
        });

        for (const policy of KNOWN) {
            it(`accepts the known policy "${policy}"`, () => {

                expect(ReferrerPolicy({ policy })).to.equal({ header: 'Referrer-Policy', value: policy });
            });
        }
    });

    describe('unit — array input', () => {

        it('joins a two-element array with ", "', () => {

            expect(ReferrerPolicy({ policy: ['no-referrer', 'strict-origin-when-cross-origin'] })).to.equal({
                header: 'Referrer-Policy',
                value: 'no-referrer, strict-origin-when-cross-origin'
            });
        });

        it('accepts a single-element array', () => {

            expect(ReferrerPolicy({ policy: ['origin'] })).to.equal({
                header: 'Referrer-Policy',
                value: 'origin'
            });
        });

        it('allows an empty array (produces empty header value)', () => {

            expect(ReferrerPolicy({ policy: [] })).to.equal({ header: 'Referrer-Policy', value: '' });
        });
    });

    describe('unit — validation', () => {

        it('throws on an unknown single policy with the hapi-aegis prefix', () => {

            expect(() => ReferrerPolicy({ policy: 'bogus' })).to.throw(/^hapi-aegis: referrerPolicy policy "bogus" is not one of:/);
        });

        it('throws when an array contains a bad element', () => {

            expect(() => ReferrerPolicy({ policy: ['strict-origin', 'bogus'] })).to.throw(/^hapi-aegis: referrerPolicy policy "bogus" is not one of:/);
        });

        it('throws on the first bad element in an all-bad array', () => {

            expect(() => ReferrerPolicy({ policy: ['first-bad', 'also-bad'] })).to.throw(/"first-bad"/);
        });

        it('throws on a non-string, non-array value', () => {

            expect(() => ReferrerPolicy({ policy: 123 })).to.throw(/^hapi-aegis: referrerPolicy policy "123" is not one of:/);
        });
    });

    describe('integration', () => {

        it('sets referrer-policy: no-referrer by default on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['referrer-policy']).to.equal('no-referrer');
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
            expect(res.headers['referrer-policy']).to.equal('no-referrer');
        });

        it('applies a server-level single-string policy', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { referrerPolicy: { policy: 'strict-origin-when-cross-origin' } }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['referrer-policy']).to.equal('strict-origin-when-cross-origin');
        });

        it('applies a server-level array policy joined with ", "', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { referrerPolicy: { policy: ['strict-origin', 'strict-origin-when-cross-origin'] } }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['referrer-policy']).to.equal('strict-origin, strict-origin-when-cross-origin');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { referrerPolicy: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['referrer-policy']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { referrerPolicy: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['referrer-policy']).to.not.exist();
            expect(onRes.headers['referrer-policy']).to.equal('no-referrer');
        });
    });
});
