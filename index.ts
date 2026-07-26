/**
 * @ninots/routing - HTTP Router with fluent API
 *
 * @packageDocumentation
 */

export type { RouterInterface } from "./src/contracts/router-interface";
export { emitRouteRegistry } from "./src/emitRouteRegistry";
/**
 * @deprecated Prefer fluent `Router` registration and typed route registry.
 * See `loadRoutes` remarks.
 */
export { loadRoutes } from "./src/loader";
export type { RouteRegistry, RouteResolver } from "./src/RouteRegistry";
export { route, setRouteResolver } from "./src/RouteRegistry";
export { Route } from "./src/route";
export { Router } from "./src/router";
export type { RoutesAutoHookOptions } from "./src/routesAutoHook";
export {
    compileRouteRegistryArtifact,
    shouldIgnoreWatchPath,
    startRoutesAutoHook,
    writeRouteRegistryIfChanged,
} from "./src/routesAutoHook";
export type {
    HttpMethod,
    RouteDefinition,
    RouteGroupOptions,
    RouteHandler,
    RouteMatch,
    RouteParams,
} from "./src/types";
