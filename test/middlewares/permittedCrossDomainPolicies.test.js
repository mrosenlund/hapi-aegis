'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const PermittedCrossDomainPolicies = require('../../lib/middlewares/permittedCrossDomainPolicies');

const { describe, it } = exports.lab = Lab.script();

describe('permittedCrossDomainPolicies middleware', () => {

    describe('unit', () => {

        it('defaults to none when no options are provided', () => {

            expect(PermittedCrossDomainPolicies()).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'none' });
        });

        it('defaults to none when options has no permittedPolicies', () => {

            expect(PermittedCrossDomainPolicies({})).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'none' });
        });

        it('returns none when permittedPolicies is "none"', () => {

            expect(PermittedCrossDomainPolicies({ permittedPolicies: 'none' })).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'none' });
        });

        it('returns master-only when permittedPolicies is "master-only"', () => {

            expect(PermittedCrossDomainPolicies({ permittedPolicies: 'master-only' })).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'master-only' });
        });

        it('returns by-content-type when permittedPolicies is "by-content-type"', () => {

            expect(PermittedCrossDomainPolicies({ permittedPolicies: 'by-content-type' })).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'by-content-type' });
        });

        it('returns all when permittedPolicies is "all"', () => {

            expect(PermittedCrossDomainPolicies({ permittedPolicies: 'all' })).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'all' });
        });

        it('falls back to default when permittedPolicies is null or empty', () => {

            expect(PermittedCrossDomainPolicies({ permittedPolicies: null })).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'none' });
            expect(PermittedCrossDomainPolicies({ permittedPolicies: '' })).to.equal({ header: 'X-Permitted-Cross-Domain-Policies', value: 'none' });
        });

        it('throws on an unknown permittedPolicies with a hapi-aegis-prefixed message', () => {

            expect(() => PermittedCrossDomainPolicies({ permittedPolicies: 'bogus' })).to.throw('hapi-aegis: permittedCrossDomainPolicies permittedPolicies "bogus" is not one of: none, master-only, by-content-type, all');
        });

        it('throws on uppercase input (strict lowercase contract)', () => {

            expect(() => PermittedCrossDomainPolicies({ permittedPolicies: 'NONE' })).to.throw('hapi-aegis: permittedCrossDomainPolicies permittedPolicies "NONE" is not one of: none, master-only, by-content-type, all');
        });
    });

    describe('integration', () => {

        it('sets X-Permitted-Cross-Domain-Policies: none by default on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['x-permitted-cross-domain-policies']).to.equal('none');
        });

        it('sets the configured value when server-level options are provided', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { permittedCrossDomainPolicies: { permittedPolicies: 'master-only' } } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['x-permitted-cross-domain-policies']).to.equal('master-only');
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
            expect(res.headers['x-permitted-cross-domain-policies']).to.equal('none');
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { permittedCrossDomainPolicies: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['x-permitted-cross-domain-policies']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { permittedCrossDomainPolicies: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['x-permitted-cross-domain-policies']).to.not.exist();
            expect(onRes.headers['x-permitted-cross-domain-policies']).to.equal('none');
        });
    });
});
