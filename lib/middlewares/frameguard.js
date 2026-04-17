'use strict';

const ALLOWED = ['deny', 'sameorigin'];

module.exports = function frameguard(options) {

    const action = (options && options.action) || 'sameorigin';

    if (!ALLOWED.includes(action)) {
        throw new Error('hapi-aegis: frameguard action must be "deny" or "sameorigin"');
    }

    return { header: 'X-Frame-Options', value: action.toUpperCase() };
};
