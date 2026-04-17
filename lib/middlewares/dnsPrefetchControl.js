'use strict';

module.exports = function dnsPrefetchControl(options) {

    const allow = !!(options && options.allow);
    return { header: 'X-DNS-Prefetch-Control', value: allow ? 'on' : 'off' };
};
