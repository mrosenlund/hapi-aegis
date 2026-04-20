'use strict';

const ALLOWED = ['same-origin', 'same-origin-allow-popups', 'unsafe-none'];

module.exports = function crossOriginOpenerPolicy(options) {

    const policy = (options && options.policy) || 'same-origin';

    if (!ALLOWED.includes(policy)) {
        throw new Error(`hapi-aegis: crossOriginOpenerPolicy policy "${policy}" is not one of: ${ALLOWED.join(', ')}`);
    }

    return { header: 'Cross-Origin-Opener-Policy', value: policy };
};
