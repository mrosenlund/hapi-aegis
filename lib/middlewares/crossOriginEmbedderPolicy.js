'use strict';

const ALLOWED = ['require-corp', 'credentialless', 'unsafe-none'];

module.exports = function crossOriginEmbedderPolicy(options) {

    const policy = (options && options.policy) || 'require-corp';

    if (!ALLOWED.includes(policy)) {
        throw new Error(`hapi-aegis: crossOriginEmbedderPolicy policy "${policy}" is not one of: ${ALLOWED.join(', ')}`);
    }

    return { header: 'Cross-Origin-Embedder-Policy', value: policy };
};
