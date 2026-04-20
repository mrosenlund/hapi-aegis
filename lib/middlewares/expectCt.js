'use strict';

/** @deprecated Expect-CT is deprecated by browsers; included for legacy compatibility. */
module.exports = function expectCt(options) {

    const rawMaxAge = options && options.maxAge;
    let maxAge;
    if (rawMaxAge === undefined) {
        maxAge = 0;
    }
    else if (Number.isInteger(rawMaxAge) && rawMaxAge >= 0) {
        maxAge = rawMaxAge;
    }
    else {
        throw new Error('hapi-aegis: expectCt maxAge must be a non-negative integer');
    }

    const rawEnforce = options && options.enforce;
    let enforce;
    if (rawEnforce === undefined) {
        enforce = false;
    }
    else if (typeof rawEnforce === 'boolean') {
        enforce = rawEnforce;
    }
    else {
        throw new Error('hapi-aegis: expectCt enforce must be a boolean');
    }

    const rawReportUri = options && options.reportUri;
    let reportUri;
    if (rawReportUri === undefined) {
        reportUri = null;
    }
    else if (typeof rawReportUri === 'string') {
        reportUri = rawReportUri;
    }
    else {
        throw new Error('hapi-aegis: expectCt reportUri must be a string');
    }

    const parts = [`max-age=${maxAge}`];
    if (enforce) {
        parts.push('enforce');
    }

    if (reportUri !== null) {
        parts.push(`report-uri="${reportUri}"`);
    }

    return { header: 'Expect-CT', value: parts.join(', ') };
};
