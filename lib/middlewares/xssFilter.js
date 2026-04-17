'use strict';

module.exports = function xssFilter() {

    return { header: 'X-XSS-Protection', value: '0' };
};
