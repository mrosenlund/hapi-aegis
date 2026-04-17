'use strict';

const DEFAULTS = {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    fontSrc: ["'self'", 'https:', 'data:'],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
    upgradeInsecureRequests: []
};

const KNOWN_DIRECTIVES = new Set([
    'base-uri',
    'sandbox',
    'default-src',
    'child-src',
    'connect-src',
    'font-src',
    'frame-src',
    'img-src',
    'manifest-src',
    'media-src',
    'object-src',
    'prefetch-src',
    'script-src',
    'script-src-elem',
    'script-src-attr',
    'style-src',
    'style-src-elem',
    'style-src-attr',
    'worker-src',
    'form-action',
    'frame-ancestors',
    'navigate-to',
    'report-uri',
    'report-to',
    'require-trusted-types-for',
    'trusted-types',
    'upgrade-insecure-requests',
    'block-all-mixed-content'
]);

// CSP keywords that must appear single-quoted in the header. A bare
// occurrence in a directive value almost always means the caller forgot
// the surrounding quotes.
const QUOTED_KEYWORDS = new Set([
    'self',
    'none',
    'unsafe-inline',
    'unsafe-eval',
    'unsafe-hashes',
    'strict-dynamic',
    'report-sample',
    'wasm-unsafe-eval',
    'inline-speculation-rules'
]);

const camelToKebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const formatDirective = (kebab, values) => {

    if (values.length === 0) {
        return kebab;
    }
    return `${kebab} ${values.join(' ')}`;
};

module.exports = function contentSecurityPolicy(options) {

    const opts = options || {};
    const useDefaults = opts.useDefaults !== false;
    const reportOnly = opts.reportOnly === true;
    const userDirectives = opts.directives || {};

    const merged = useDefaults
        ? Object.assign({}, DEFAULTS, userDirectives)
        : userDirectives;

    const parts = [];
    for (const [name, values] of Object.entries(merged)) {
        const kebab = camelToKebab(name);

        if (!KNOWN_DIRECTIVES.has(kebab)) {
            console.warn(`hapi-aegis: unknown CSP directive "${kebab}"`);
        }

        for (const v of values) {
            if (QUOTED_KEYWORDS.has(v)) {
                console.warn(`hapi-aegis: CSP directive "${kebab}" has value "${v}" without quotes; did you mean "'${v}'"?`);
            }
        }

        parts.push(formatDirective(kebab, values));
    }

    return {
        header: reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
        value: parts.join('; ')
    };
};
