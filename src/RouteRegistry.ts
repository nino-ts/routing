/**
 * Build-time typed route registry and runtime `route()` helper.
 *
 * @packageDocumentation
 */

import type { RouteParams } from "./types";

/**
 * Empty interface augmented by generated `types/routes.d.ts` via
 * `declare module "@ninots/routing"`.
 *
 * Named routes map to their path-param shapes. Routes without params use
 * `Record<never, never>` (never `{}`, which accepts any non-nullish value).
 *
 * There is intentionally no `string` fallback when the registry is empty —
 * `keyof RouteRegistry` is `never` until the artifact augments this interface.
 */
export interface RouteRegistry {}

/**
 * Minimal router surface required by {@link route}.
 */
export interface RouteResolver {
    url(name: string, params?: RouteParams): string;
}

type RegistryName = keyof RouteRegistry;

type ParamsOf<Name extends RegistryName> = RouteRegistry[Name];

/**
 * `true` when the param object has no keys (`Record<never, never>`).
 */
type HasNoParams<Name extends RegistryName> = [keyof ParamsOf<Name>] extends [never] ? true : false;

type RouteCallArgs<Name extends RegistryName> = HasNoParams<Name> extends true
    ? [] | [ParamsOf<Name>?]
    : [ParamsOf<Name>];

let resolver: RouteResolver | undefined;

/**
 * Bind the global {@link route} helper to a router instance.
 *
 * Called automatically by foundation `wireCoreServices`.
 *
 * @param router - Router (or compatible) that implements `url(name, params?)`
 */
export function setRouteResolver(router: RouteResolver): void {
    resolver = router;
}

/**
 * Generate a URL for a named route, typed against {@link RouteRegistry}.
 *
 * The second argument is required if and only if the route declares `:params`.
 *
 * @param name - Route name (`keyof RouteRegistry`)
 * @param args - Path params when the route has `:param` segments
 * @returns The generated path from {@link RouteResolver.url}
 * @throws Error when no resolver has been set via {@link setRouteResolver}
 */
export function route<Name extends RegistryName>(name: Name, ...args: RouteCallArgs<Name>): string {
    if (resolver === undefined) {
        throw new Error(
            "Route resolver not set. Call setRouteResolver(router) during application boot (wireCoreServices).",
        );
    }

    const params = (args[0] ?? {}) as RouteParams;
    return resolver.url(String(name), params);
}
