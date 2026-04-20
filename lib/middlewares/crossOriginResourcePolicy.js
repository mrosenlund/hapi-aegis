'use strict';

const ALLOWED = ['same-origin', 'same-site', 'cross-origin'];

module.exports = function crossOriginResourcePolicy(options) {

    const policy = (options && options.policy) || 'same-origin';

    if (!ALLOWED.includes(policy)) {
        throw new Error(`hapi-aegis: crossOriginResourcePolicy policy "${policy}" is not one of: ${ALLOWED.join(', ')}`);
    }

    return { header: 'Cross-Origin-Resource-Policy', value: policy };
};
