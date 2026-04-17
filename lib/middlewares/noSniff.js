'use strict';

module.exports = function noSniff() {

    return { header: 'X-Content-Type-Options', value: 'nosniff' };
};
