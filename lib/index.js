'use strict';

const Crypto = require('crypto');
const Fs = require('fs');
const Path = require('path');

const Pkg = require('../package.json');
const ContentSecurityPolicy = require('./middlewares/contentSecurityPolicy');

const NONCE_DIRECTIVES = ['scriptSrc', 'styleSrc'];

const generateNonce = () => Crypto.randomBytes(16).toString('base64');

const injectNonce = (directives, nonce) => {

    const value = `'nonce-${nonce}'`;
    for (const name of NONCE_DIRECTIVES) {
        const existing = directives[name];
        if (existing === null || existing === undefined) {
            directives[name] = [value];
            continue;
        }

        const asArray = Array.isArray(existing) ? existing.slice() : [existing];
        asArray.push(value);
        directives[name] = asArray;
    }

    return directives;
};

const cspWantsNonces = (cfg) =>
    cfg && typeof cfg === 'object' && cfg.generateNonces === true;

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

        server.ext('onPreAuth', (request, h) => {

            const routeOverrides = request.route.settings.plugins.aegis || {};
            const cspCfg = resolveConfig('contentSecurityPolicy', options, routeOverrides);
            if (cspWantsNonces(cspCfg)) {
                request.plugins.aegis = request.plugins.aegis || {};
                request.plugins.aegis.nonce = generateNonce();
            }

            return h.continue;
        });

        server.ext('onPreResponse', (request, h) => {

            const response = request.response;
            const routeOverrides = request.route.settings.plugins.aegis || {};

            for (const middleware of middlewares) {
                const cfg = resolveConfig(middleware.name, options, routeOverrides);
                if (cfg === false) {
                    continue;
                }

                let runCfg = cfg;
                if (middleware.name === 'contentSecurityPolicy' && cfg && typeof cfg === 'object') {
                    const wantsNonces = cspWantsNonces(cfg) &&
                        request.plugins.aegis &&
                        request.plugins.aegis.nonce;

                    if (wantsNonces) {
                        const useDefaults = cfg.useDefaults !== false;
                        const baseDirectives = useDefaults
                            ? Object.assign({}, ContentSecurityPolicy.DEFAULTS, cfg.directives || {})
                            : (cfg.directives || {});
                        const resolved = ContentSecurityPolicy.resolveDirectives(baseDirectives, request);
                        injectNonce(resolved, request.plugins.aegis.nonce);
                        runCfg = Object.assign({}, cfg, { directives: resolved, useDefaults: false });
                    }
                    else if (cfg.directives) {
                        runCfg = Object.assign({}, cfg, {
                            directives: ContentSecurityPolicy.resolveDirectives(cfg.directives, request)
                        });
                    }
                }

                const result = middleware.run(runCfg);
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
