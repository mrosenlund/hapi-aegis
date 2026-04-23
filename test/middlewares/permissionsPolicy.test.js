'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const PermissionsPolicy = require('../../lib/middlewares/permissionsPolicy');

const { describe, it } = exports.lab = Lab.script();

const DEFAULT_VALUE = 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()';

describe('permissionsPolicy middleware', () => {

    describe('unit — defaults', () => {

        it('returns the 8-feature denied baseline with no options', () => {

            expect(PermissionsPolicy()).to.equal({ header: 'Permissions-Policy', value: DEFAULT_VALUE });
        });

        it('returns the baseline with an empty options object', () => {

            expect(PermissionsPolicy({})).to.equal({ header: 'Permissions-Policy', value: DEFAULT_VALUE });
        });
    });

    describe('unit — allowlist formatting', () => {

        it('emits "()" for an empty array', () => {

            expect(PermissionsPolicy({ features: { camera: [] } })).to.equal({
                header: 'Permissions-Policy',
                value: 'camera=()'
            });
        });

        it('emits "(self)" for the self keyword', () => {

            expect(PermissionsPolicy({ features: { camera: ['self'] } })).to.equal({
                header: 'Permissions-Policy',
                value: 'camera=(self)'
            });
        });

        it('emits "*" for the wildcard', () => {

            expect(PermissionsPolicy({ features: { fullscreen: ['*'] } })).to.equal({
                header: 'Permissions-Policy',
                value: 'fullscreen=*'
            });
        });

        it('quotes origins and leaves keywords unquoted', () => {

            expect(PermissionsPolicy({
                features: {
                    geolocation: ['self', 'https://maps.example.com']
                }
            })).to.equal({
                header: 'Permissions-Policy',
                value: 'geolocation=(self "https://maps.example.com")'
            });
        });

        it('quotes multiple origins separated by spaces', () => {

            expect(PermissionsPolicy({
                features: {
                    geolocation: ['https://a.example.com', 'https://b.example.com']
                }
            })).to.equal({
                header: 'Permissions-Policy',
                value: 'geolocation=("https://a.example.com" "https://b.example.com")'
            });
        });

        it('joins multiple features with ", "', () => {

            expect(PermissionsPolicy({
                features: {
                    camera: [],
                    microphone: ['self']
                }
            })).to.equal({
                header: 'Permissions-Policy',
                value: 'camera=(), microphone=(self)'
            });
        });

        it('accepts the src keyword unquoted', () => {

            expect(PermissionsPolicy({ features: { fullscreen: ['src'] } })).to.equal({
                header: 'Permissions-Policy',
                value: 'fullscreen=(src)'
            });
        });
    });

    describe('unit — camelCase to kebab-case', () => {

        it('converts "pictureInPicture" to "picture-in-picture"', () => {

            expect(PermissionsPolicy({ features: { pictureInPicture: [] } })).to.equal({
                header: 'Permissions-Policy',
                value: 'picture-in-picture=()'
            });
        });

        it('converts "publickeyCredentialsGet" to "publickey-credentials-get"', () => {

            expect(PermissionsPolicy({ features: { publickeyCredentialsGet: ['self'] } })).to.equal({
                header: 'Permissions-Policy',
                value: 'publickey-credentials-get=(self)'
            });
        });
    });

    describe('unit — validation', () => {

        it('throws when features is not an object', () => {

            expect(() => PermissionsPolicy({ features: 'nope' })).to.throw(
                'hapi-aegis: permissionsPolicy features must be an object'
            );
        });

        it('throws when features is null', () => {

            expect(() => PermissionsPolicy({ features: null })).to.throw(
                'hapi-aegis: permissionsPolicy features must be an object'
            );
        });

        it('throws when features is an array', () => {

            expect(() => PermissionsPolicy({ features: ['camera'] })).to.throw(
                'hapi-aegis: permissionsPolicy features must be an object'
            );
        });

        it('throws when an allowlist is not an array', () => {

            expect(() => PermissionsPolicy({ features: { camera: 'self' } })).to.throw(
                'hapi-aegis: permissionsPolicy feature "camera" allowlist must be an array'
            );
        });

        it('throws when an allowlist contains a non-string', () => {

            expect(() => PermissionsPolicy({ features: { camera: [123] } })).to.throw(
                'hapi-aegis: permissionsPolicy feature "camera" allowlist values must be strings'
            );
        });
    });

    describe('unit — warnings', () => {

        it('warns on unknown feature names but still emits the header', () => {

            const original = console.warn;
            const warnings = [];
            console.warn = (msg) => warnings.push(msg);

            try {
                const result = PermissionsPolicy({ features: { futureThingNobodyKnows: [] } });
                expect(result.value).to.equal('future-thing-nobody-knows=()');
                expect(warnings).to.have.length(1);
                expect(warnings[0]).to.contain('unknown Permissions-Policy feature "future-thing-nobody-knows"');
            }
            finally {
                console.warn = original;
            }
        });

        it('warns when an allowlist value is not a keyword or recognizable origin', () => {

            const original = console.warn;
            const warnings = [];
            console.warn = (msg) => warnings.push(msg);

            try {
                PermissionsPolicy({ features: { camera: ['example.com'] } });
                expect(warnings.some((w) => w.includes('does not look like an origin'))).to.be.true();
            }
            finally {
                console.warn = original;
            }
        });
    });

    describe('integration', () => {

        it('sets the default Permissions-Policy header on 200 responses', async () => {

            const server = Hapi.server();
            await server.register(Aegis);
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.statusCode).to.equal(200);
            expect(res.headers['permissions-policy']).to.equal(DEFAULT_VALUE);
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
            expect(res.headers['permissions-policy']).to.equal(DEFAULT_VALUE);
        });

        it('emits a custom features map verbatim (fully replaces defaults)', async () => {

            const server = Hapi.server();
            await server.register({
                plugin: Aegis,
                options: {
                    permissionsPolicy: {
                        features: {
                            camera: ['self'],
                            fullscreen: ['*'],
                            geolocation: ['self', 'https://maps.example.com']
                        }
                    }
                }
            });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['permissions-policy']).to.equal(
                'camera=(self), fullscreen=*, geolocation=(self "https://maps.example.com")'
            );
        });

        it('can be disabled via server-level options', async () => {

            const server = Hapi.server();
            await server.register({ plugin: Aegis, options: { permissionsPolicy: false } });
            server.route({ method: 'GET', path: '/', handler: () => 'ok' });

            const res = await server.inject('/');
            expect(res.headers['permissions-policy']).to.not.exist();
        });

        it('can be disabled on a single route via plugins.aegis config', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/off',
                options: { plugins: { aegis: { permissionsPolicy: false } } },
                handler: () => 'ok'
            });
            server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

            const offRes = await server.inject('/off');
            const onRes = await server.inject('/on');

            expect(offRes.headers['permissions-policy']).to.not.exist();
            expect(onRes.headers['permissions-policy']).to.equal(DEFAULT_VALUE);
        });

        it('accepts a route-level features override that replaces server defaults', async () => {

            const server = Hapi.server();
            await server.register(Aegis);

            server.route({
                method: 'GET',
                path: '/perms',
                options: {
                    plugins: {
                        aegis: {
                            permissionsPolicy: { features: { camera: ['self'] } }
                        }
                    }
                },
                handler: () => 'ok'
            });

            const res = await server.inject('/perms');
            expect(res.headers['permissions-policy']).to.equal('camera=(self)');
        });
    });
});
