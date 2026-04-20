'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');

const Aegis = require('../..');
const OriginAgentCluster = require('../../lib/middlewares/originAgentCluster');

const { describe, it } = exports.lab = Lab.script();

describe('originAgentCluster middleware', () => {

    it('returns { header: Origin-Agent-Cluster, value: ?1 }', () => {

        expect(OriginAgentCluster()).to.equal({ header: 'Origin-Agent-Cluster', value: '?1' });
    });

    it('takes no options', () => {

        expect(OriginAgentCluster()).to.equal(OriginAgentCluster({ anything: true }));
    });

    it('sets the header on 200 responses', async () => {

        const server = Hapi.server();
        await server.register(Aegis);
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(200);
        expect(res.headers['origin-agent-cluster']).to.equal('?1');
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
        expect(res.headers['origin-agent-cluster']).to.equal('?1');
    });

    it('can be disabled via server-level options', async () => {

        const server = Hapi.server();
        await server.register({ plugin: Aegis, options: { originAgentCluster: false } });
        server.route({ method: 'GET', path: '/', handler: () => 'ok' });

        const res = await server.inject('/');
        expect(res.headers['origin-agent-cluster']).to.not.exist();
    });

    it('can be disabled on a single route via plugins.aegis config', async () => {

        const server = Hapi.server();
        await server.register(Aegis);

        server.route({
            method: 'GET',
            path: '/off',
            options: { plugins: { aegis: { originAgentCluster: false } } },
            handler: () => 'ok'
        });
        server.route({ method: 'GET', path: '/on', handler: () => 'ok' });

        const offRes = await server.inject('/off');
        const onRes = await server.inject('/on');

        expect(offRes.headers['origin-agent-cluster']).to.not.exist();
        expect(onRes.headers['origin-agent-cluster']).to.equal('?1');
    });
});
