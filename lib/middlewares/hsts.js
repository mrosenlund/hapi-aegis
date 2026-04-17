'use strict';

const DEFAULT_MAX_AGE = 15552000; // 180 days

module.exports = function hsts(options) {

    const rawMaxAge = options && options.maxAge;
    let maxAge;
    if (rawMaxAge === undefined) {
        maxAge = DEFAULT_MAX_AGE;
    }
    else if (Number.isInteger(rawMaxAge) && rawMaxAge >= 0) {
        maxAge = rawMaxAge;
    }
    else {
        throw new Error('hapi-aegis: hsts maxAge must be a non-negative integer');
    }

    const includeSubDomains = !(options && options.includeSubDomains === false);
    const preload = !!(options && options.preload);

    const parts = [`max-age=${maxAge}`];
    if (includeSubDomains) {
        parts.push('includeSubDomains');
    }
    if (preload) {
        parts.push('preload');
    }

    return { header: 'Strict-Transport-Security', value: parts.join('; ') };
};
