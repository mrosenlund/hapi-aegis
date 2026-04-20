'use strict';

// Run: node examples/basic.js, then: curl -I http://localhost:3000

const Hapi = require('@hapi/hapi');
const Aegis = require('..');

const start = async () => {

    const server = Hapi.server({ host: 'localhost', port: 3000 });

    await server.register(Aegis);

    server.route({
        method: 'GET',
        path: '/',
        handler: () => 'Hello, secure world!'
    });

    await server.start();
    console.log(`Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {

    console.error(err);
    process.exit(1);
});

start();
