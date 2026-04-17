'use strict';

const KNOWN_POLICIES = [
    'no-referrer',
    'no-referrer-when-downgrade',
    'origin',
    'origin-when-cross-origin',
    'same-origin',
    'strict-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
];

module.exports = function referrerPolicy(options) {

    const raw = (options && options.policy) !== undefined ? options.policy : 'no-referrer';
    const policies = Array.isArray(raw) ? raw : [raw];

    for (const p of policies) {
        if (!KNOWN_POLICIES.includes(p)) {
            throw new Error(`hapi-aegis: referrerPolicy policy "${p}" is not one of: ${KNOWN_POLICIES.join(', ')}`);
        }
    }

    return { header: 'Referrer-Policy', value: policies.join(', ') };
};
