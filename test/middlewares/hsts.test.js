'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const Hsts = require('../../lib/middlewares/hsts');

const { describe, it } = exports.lab = Lab.script();

const DEFAULT_VALUE = 'max-age=15552000; includeSubDomains';

describe('hsts middleware', () => {

    describe('unit — default values', () => {

        it('returns max-age=15552000; includeSubDomains by default', () => {

            expect(Hsts()).to.equal({ header: 'Strict-Transport-Security', value: DEFAULT_VALUE });
        });

        it('uses defaults with an empty options object', () => {

            expect(Hsts({})).to.equal({ header: 'Strict-Transport-Security', value: DEFAULT_VALUE });
        });
    });

    describe('unit — option combinations', () => {

        it('includes preload when preload: true', () => {

            expect(Hsts({ preload: true })).to.equal({
                header: 'Strict-Transport-Security',
                value: 'max-age=15552000; includeSubDomains; preload'
            });
        });

        it('omits includeSubDomains when includeSubDomains: false', () => {

            expect(Hsts({ includeSubDomains: false })).to.equal({
                header: 'Strict-Transport-Security',
                value: 'max-age=15552000'
            });
        });

        it('keeps includeSubDomains when explicitly true', () => {

            expect(Hsts({ includeSubDomains: true })).to.equal({
                header: 'Strict-Transport-Security',
                value: DEFAULT_VALUE
            });
        });

        it('respects a custom maxAge', () => {

            expect(Hsts({ maxAge: 3600 })).to.equal({
                header: 'Strict-Transport-Security',
                value: 'max-age=3600; includeSubDomains'
            });
        });

        it('accepts maxAge: 0 (the "disable HSTS" signal)', () => {

            expect(Hsts({ maxAge: 0 })).to.equal({
                header: 'Strict-Transport-Security',
                value: 'max-age=0; includeSubDomains'
            });
        });

        it('combines maxAge with preload, no includeSubDomains', () => {

            expect(Hsts({ maxAge: 3600, includeSubDomains: false, preload: true })).to.equal({
                header: 'Strict-Transport-Security',
                value: 'max-age=3600; preload'
            });
        });

        it('all three options at their most permissive', () => {

            expect(Hsts({ maxAge: 63072000, includeSubDomains: true, preload: true })).to.equal({
                header: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload'
            });
        });

        it('preload: false is the same as omitting preload', () => {

            expect(Hsts({ preload: false })).to.equal({
                header: 'Strict-Transport-Security',
                value: DEFAULT_VALUE
            });
        });
    });

    describe('unit — validation', () => {

        it('throws when maxAge is negative', () => {

            expect(() => Hsts({ maxAge: -1 })).to.throw('hapi-aegis: hsts maxAge must be a non-negative integer');
        });

        it('throws when maxAge is a non-integer number', () => {

            expect(() => Hsts({ maxAge: 3600.5 })).to.throw('hapi-aegis: hsts maxAge must be a non-negative integer');
        });

        it('throws when maxAge is a string', () => {

            expect(() => Hsts({ maxAge: '3600' })).to.throw('hapi-aegis: hsts maxAge must be a non-negative integer');
        });

        it('throws when maxAge is NaN', () => {

            expect(() => Hsts({ maxAge: NaN })).to.throw('hapi-aegis: hsts maxAge must be a non-negative integer');
        });

        it('throws when maxAge is Infinity', () => {

            expect(() => Hsts({ maxAge: Infinity })).to.throw('hapi-aegis: hsts maxAge must be a non-negative integer');
        });

        it('throws when maxAge is null (explicit null, not absence)', () => {

            expect(() => Hsts({ maxAge: null })).to.throw('hapi-aegis: hsts maxAge must be a non-negative integer');
        });

        it('throws when maxAge is a boolean', () => {

            expect(() => Hsts({ maxAge: true })).to.throw('hapi-aegis: hsts maxAge must be a non-negative integer');
        });
    });

    describe('integration', () => {

        it('sets the default header on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['strict-transport-security']).to.equal(DEFAULT_VALUE);
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
            expect(res.headers['strict-transport-security']).to.equal(DEFAULT_VALUE);
        });

        it('applies server-level options', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { hsts: { maxAge: 3600, includeSubDomains: false, preload: true } }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['strict-transport-security']).to.equal('max-age=3600; preload');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { hsts: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['strict-transport-security']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { hsts: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['strict-transport-security']).to.not.exist();
            expect(onRes.headers['strict-transport-security']).to.equal(DEFAULT_VALUE);
        });
    });
});
