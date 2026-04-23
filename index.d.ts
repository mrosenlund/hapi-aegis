import * as Hapi from '@hapi/hapi';

export type CspDirectiveSource =
    | string
    | ((request: Hapi.Request) => string | string[]);

export interface ContentSecurityPolicyOptions {
    directives?: Record<string, CspDirectiveSource | CspDirectiveSource[]>;
    useDefaults?: boolean;
    reportOnly?: boolean;
    generateNonces?: boolean;
}

export interface AegisRequestState {
    nonce?: string;
}

export interface HstsOptions {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
}

export interface FrameguardOptions {
    action?: 'deny' | 'sameorigin';
}

export type ReferrerPolicyToken =
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

export interface ReferrerPolicyOptions {
    policy?: ReferrerPolicyToken | ReferrerPolicyToken[];
}

export interface DnsPrefetchControlOptions {
    allow?: boolean;
}

export interface CrossOriginEmbedderPolicyOptions {
    policy?: 'require-corp' | 'credentialless' | 'unsafe-none';
}

export interface CrossOriginOpenerPolicyOptions {
    policy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
}

export interface CrossOriginResourcePolicyOptions {
    policy?: 'same-origin' | 'same-site' | 'cross-origin';
}

export interface ExpectCtOptions {
    maxAge?: number;
    enforce?: boolean;
    reportUri?: string;
}

export interface PermissionsPolicyOptions {
    features?: Record<string, string[]>;
}

export interface PermittedCrossDomainPoliciesOptions {
    permittedPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all';
}

export interface AegisOptions {
    contentSecurityPolicy?: ContentSecurityPolicyOptions | false;
    crossOriginEmbedderPolicy?: CrossOriginEmbedderPolicyOptions | false;
    crossOriginOpenerPolicy?: CrossOriginOpenerPolicyOptions | false;
    crossOriginResourcePolicy?: CrossOriginResourcePolicyOptions | false;
    dnsPrefetchControl?: DnsPrefetchControlOptions | false;
    expectCt?: ExpectCtOptions | false;
    frameguard?: FrameguardOptions | false;
    hidePoweredBy?: boolean;
    hsts?: HstsOptions | false;
    ieNoOpen?: boolean;
    noSniff?: boolean;
    originAgentCluster?: boolean;
    permissionsPolicy?: PermissionsPolicyOptions | false;
    permittedCrossDomainPolicies?: PermittedCrossDomainPoliciesOptions | false;
    referrerPolicy?: ReferrerPolicyOptions | false;
    xssFilter?: boolean;
}

export const plugin: Hapi.Plugin<AegisOptions>;

declare module '@hapi/hapi' {
    interface PluginSpecificConfiguration {
        aegis?: Partial<AegisOptions>;
    }

    interface PluginsStates {
        aegis?: AegisRequestState;
    }
}
