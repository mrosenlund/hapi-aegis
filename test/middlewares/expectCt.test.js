'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const ExpectCt = require('../../lib/middlewares/expectCt');

const { describe, it } = exports.lab = Lab.script();

const DEFAULT_VALUE = 'max-age=0';

describe('expectCt middleware', () => {

    describe('unit — default values', () => {

        it('returns max-age=0 by default', () => {

            expect(ExpectCt()).to.equal({ header: 'Expect-CT', value: DEFAULT_VALUE });
        });

        it('uses defaults with an empty options object', () => {

            expect(ExpectCt({})).to.equal({ header: 'Expect-CT', value: DEFAULT_VALUE });
        });
    });

    describe('unit — option combinations', () => {

        it('respects a custom maxAge', () => {

            expect(ExpectCt({ maxAge: 86400 })).to.equal({ header: 'Expect-CT', value: 'max-age=86400' });
        });

        it('appends enforce when enforce: true', () => {

            expect(ExpectCt({ enforce: true })).to.equal({ header: 'Expect-CT', value: 'max-age=0, enforce' });
        });

        it('omits enforce when enforce: false', () => {

            expect(ExpectCt({ enforce: false })).to.equal({ header: 'Expect-CT', value: DEFAULT_VALUE });
        });

        it('appends report-uri when reportUri is set', () => {

            expect(ExpectCt({ reportUri: 'https://example.com/report' })).to.equal({
                header: 'Expect-CT',
                value: 'max-age=0, report-uri="https://example.com/report"'
            });
        });

        it('combines maxAge, enforce and reportUri in the documented order', () => {

            expect(ExpectCt({ maxAge: 86400, enforce: true, reportUri: 'https://example.com/report' })).to.equal({
                header: 'Expect-CT',
                value: 'max-age=86400, enforce, report-uri="https://example.com/report"'
            });
        });

        it('accepts maxAge: 0 explicitly', () => {

            expect(ExpectCt({ maxAge: 0 })).to.equal({ header: 'Expect-CT', value: DEFAULT_VALUE });
        });

        it('accepts an empty reportUri string', () => {

            expect(ExpectCt({ reportUri: '' })).to.equal({ header: 'Expect-CT', value: 'max-age=0, report-uri=""' });
        });
    });

    describe('unit — validation', () => {

        it('throws when maxAge is negative', () => {

            expect(() => ExpectCt({ maxAge: -1 })).to.throw('hapi-aegis: expectCt maxAge must be a non-negative integer');
        });

        it('throws when maxAge is a non-integer number', () => {

            expect(() => ExpectCt({ maxAge: 3.14 })).to.throw('hapi-aegis: expectCt maxAge must be a non-negative integer');
        });

        it('throws when maxAge is a string', () => {

            expect(() => ExpectCt({ maxAge: '60' })).to.throw('hapi-aegis: expectCt maxAge must be a non-negative integer');
        });

        it('throws when maxAge is NaN', () => {

            expect(() => ExpectCt({ maxAge: NaN })).to.throw('hapi-aegis: expectCt maxAge must be a non-negative integer');
        });

        it('throws when enforce is a string', () => {

            expect(() => ExpectCt({ enforce: 'true' })).to.throw('hapi-aegis: expectCt enforce must be a boolean');
        });

        it('throws when enforce is a number', () => {

            expect(() => ExpectCt({ enforce: 1 })).to.throw('hapi-aegis: expectCt enforce must be a boolean');
        });

        it('throws when enforce is null (explicit, not absence)', () => {

            expect(() => ExpectCt({ enforce: null })).to.throw('hapi-aegis: expectCt enforce must be a boolean');
        });

        it('throws when reportUri is a number', () => {

            expect(() => ExpectCt({ reportUri: 42 })).to.throw('hapi-aegis: expectCt reportUri must be a string');
        });

        it('throws when reportUri is null (explicit, not absence)', () => {

            expect(() => ExpectCt({ reportUri: null })).to.throw('hapi-aegis: expectCt reportUri must be a string');
        });

        it('throws when reportUri is an object', () => {

            expect(() => ExpectCt({ reportUri: { url: 'x' } })).to.throw('hapi-aegis: expectCt reportUri must be a string');
        });
    });

    describe('integration', () => {

        it('sets the default header on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['expect-ct']).to.equal(DEFAULT_VALUE);
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
            expect(res.headers['expect-ct']).to.equal(DEFAULT_VALUE);
        });

        it('applies server-level options', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: { expectCt: { maxAge: 86400, enforce: true, reportUri: 'https://example.com/r' } }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['expect-ct']).to.equal('max-age=86400, enforce, report-uri="https://example.com/r"');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { expectCt: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['expect-ct']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { expectCt: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['expect-ct']).to.not.exist();
            expect(onRes.headers['expect-ct']).to.equal(DEFAULT_VALUE);
        });
    });
});
