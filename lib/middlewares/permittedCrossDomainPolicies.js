'use strict';

const ALLOWED = ['none', 'master-only', 'by-content-type', 'all'];

module.exports = function permittedCrossDomainPolicies(options) {

    const permittedPolicies = (options && options.permittedPolicies) || 'none';

    if (!ALLOWED.includes(permittedPolicies)) {
        throw new Error(`hapi-aegis: permittedCrossDomainPolicies permittedPolicies "${permittedPolicies}" is not one of: ${ALLOWED.join(', ')}`);
    }

    return { header: 'X-Permitted-Cross-Domain-Policies', value: permittedPolicies };
};
