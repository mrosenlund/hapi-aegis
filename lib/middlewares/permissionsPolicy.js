'use strict';

const DEFAULT_FEATURES = {
    accelerometer: [],
    camera: [],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    microphone: [],
    payment: [],
    usb: []
};

const KNOWN_FEATURES = new Set([
    'accelerometer',
    'ambient-light-sensor',
    'attribution-reporting',
    'autoplay',
    'battery',
    'bluetooth',
    'browsing-topics',
    'camera',
    'clipboard-read',
    'clipboard-write',
    'compute-pressure',
    'cross-origin-isolated',
    'display-capture',
    'document-domain',
    'encrypted-media',
    'execution-while-not-rendered',
    'execution-while-out-of-viewport',
    'fullscreen',
    'gamepad',
    'geolocation',
    'gyroscope',
    'hid',
    'identity-credentials-get',
    'idle-detection',
    'keyboard-map',
    'local-fonts',
    'magnetometer',
    'microphone',
    'midi',
    'otp-credentials',
    'payment',
    'picture-in-picture',
    'publickey-credentials-create',
    'publickey-credentials-get',
    'screen-wake-lock',
    'serial',
    'speaker-selection',
    'storage-access',
    'sync-xhr',
    'unload',
    'usb',
    'web-share',
    'window-management',
    'xr-spatial-tracking'
]);

const KEYWORDS = new Set(['self', 'src', '*']);

const camelToKebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const isOriginLike = (value) => /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value);

const formatAllowlist = (tokens, featureName) => {

    if (tokens.length === 0) {
        return '()';
    }

    if (tokens.length === 1 && tokens[0] === '*') {
        return '*';
    }

    const parts = tokens.map((token) => {

        if (KEYWORDS.has(token)) {
            return token;
        }

        if (!isOriginLike(token)) {
            console.warn(`hapi-aegis: permissionsPolicy feature "${featureName}" value "${token}" does not look like an origin or a known keyword (self, src, *)`);
        }

        return `"${token}"`;
    });

    return `(${parts.join(' ')})`;
};

module.exports = function permissionsPolicy(options) {

    const opts = options || {};
    const features = Object.prototype.hasOwnProperty.call(opts, 'features')
        ? opts.features
        : DEFAULT_FEATURES;

    if (features === null || typeof features !== 'object' || Array.isArray(features)) {
        throw new Error('hapi-aegis: permissionsPolicy features must be an object');
    }

    const parts = [];
    for (const [name, allowlist] of Object.entries(features)) {
        if (!Array.isArray(allowlist)) {
            throw new Error(`hapi-aegis: permissionsPolicy feature "${name}" allowlist must be an array`);
        }

        for (const token of allowlist) {
            if (typeof token !== 'string') {
                throw new Error(`hapi-aegis: permissionsPolicy feature "${name}" allowlist values must be strings`);
            }
        }

        const kebab = camelToKebab(name);

        if (!KNOWN_FEATURES.has(kebab)) {
            console.warn(`hapi-aegis: unknown Permissions-Policy feature "${kebab}"`);
        }

        parts.push(`${kebab}=${formatAllowlist(allowlist, kebab)}`);
    }

    return { header: 'Permissions-Policy', value: parts.join(', ') };
};
