'use strict';

// Run: node examples/custom.js
// Then: curl -I http://localhost:3000/      (all configured headers)
//       curl -I http://localhost:3000/api   (CSP absent — route override)

const Hapi = require('@hapi/hapi');
const Aegis = require('..');

const start = async () => {

    const server = Hapi.server({ host: 'localhost', port: 3000 });

    await server.register({
        plugin: Aegis,
        options: {
            // Strict CSP: only allow 'self' sources, no unsafe-inline, no remote origins.
            contentSecurityPolicy: {
                useDefaults: false,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'"],
                    imgSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    connectSrc: ["'self'"],
                    frameSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    frameAncestors: ["'self'"]
                }
            },
            // HSTS with preload — eligible for browser HSTS preload lists.
            hsts: {
                maxAge: 63072000,
                includeSubDomains: true,
                preload: true
            },
            // Frameguard deny — forbid all framing, including same-origin.
            frameguard: { action: 'deny' },
            // Disable the legacy X-XSS-Protection header entirely.
            xssFilter: false
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: () => 'Hello from a locked-down route.'
    });

    // Route-level override: disable CSP for this endpoint to simulate an API
    // that serves only JSON and does not need a Content-Security-Policy header.
    server.route({
        method: 'GET',
        path: '/api',
        options: {
            plugins: {
                aegis: {
                    contentSecurityPolicy: false
                }
            }
        },
        handler: () => ({ ok: true })
    });

    await server.start();
    console.log(`Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {

    console.error(err);
    process.exit(1);
});

start();
