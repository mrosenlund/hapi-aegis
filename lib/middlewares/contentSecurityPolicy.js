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

const camelToKebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const formatDirective = (name, values) => {

    const kebab = camelToKebab(name);
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
        parts.push(formatDirective(name, values));
    }

    return {
        header: reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
        value: parts.join('; ')
    };
};
