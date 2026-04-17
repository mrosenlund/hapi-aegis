'use strict';

const Fs = require('fs');
const Path = require('path');

const Pkg = require('../package.json');

const MIDDLEWARES_DIR = Path.join(__dirname, 'middlewares');

const loadMiddlewares = () => {

    if (!Fs.existsSync(MIDDLEWARES_DIR)) {
        return [];
    }

    return Fs.readdirSync(MIDDLEWARES_DIR)
        .filter((f) => f.endsWith('.js'))
        .map((f) => ({
            name: Path.basename(f, '.js'),
            run: require(Path.join(MIDDLEWARES_DIR, f))
        }));
};

const deleteHeader = (headers, name) => {

    if (!headers) {
        return;
    }

    delete headers[name];
    delete headers[name.toLowerCase()];
};

const applyHeader = (response, result) => {

    if (!result || !result.header) {
        return;
    }

    if (response.isBoom) {
        const headers = response.output.headers;
        if (result.action === 'remove') {
            deleteHeader(headers, result.header);
            return;
        }
        headers[result.header] = result.value;
        return;
    }

    if (result.action === 'remove') {
        deleteHeader(response.headers, result.header);
        return;
    }

    response.header(result.header, result.value);
};

const resolveConfig = (middlewareName, serverOptions, routeOverrides) => {

    if (Object.prototype.hasOwnProperty.call(routeOverrides, middlewareName)) {
        return routeOverrides[middlewareName];
    }

    return serverOptions[middlewareName];
};

exports.plugin = {
    name: 'hapi-aegis',
    version: Pkg.version,
    register(server, options = {}) {

        const middlewares = loadMiddlewares();

        server.ext('onPreResponse', (request, h) => {

            const response = request.response;
            const routeOverrides = request.route.settings.plugins.aegis || {};

            for (const middleware of middlewares) {
                const cfg = resolveConfig(middleware.name, options, routeOverrides);
                if (cfg === false) {
                    continue;
                }

                const result = middleware.run(cfg);
                const results = Array.isArray(result) ? result : [result];
                for (const r of results) {
                    applyHeader(response, r);
                }
            }

            return h.continue;
        });
    }
};

exports.internals = {
    applyHeader,
    resolveConfig,
    loadMiddlewares,
    deleteHeader
};
