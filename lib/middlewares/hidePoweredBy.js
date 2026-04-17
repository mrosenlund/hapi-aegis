'use strict';

module.exports = function hidePoweredBy() {

    return [
        { action: 'remove', header: 'X-Powered-By' },
        { action: 'remove', header: 'Server' }
    ];
};
