/**
 * Type definitions for the Routing package.
 *
 * @packageDocumentation
 */

/**
 * Supported HTTP methods.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Route parameters extracted from the URL.
 */
export type RouteParams = Record<string, string>;

/**
 * Handler function for a route.
 *
 * @param request - The incoming request
 * @param params - Route parameters extracted from the URL
 * @returns A Response or Promise of Response
 */
export type RouteHandler = (request: Request, params: RouteParams) => Response | Promise<Response>;

/**
 * Definition of a single route.
 */
export interface RouteDefinition {
  /**
   * HTTP method for this route.
   */
  method: HttpMethod;

  /**
   * URL pattern (may include :param placeholders).
   */
  path: string;

  /**
   * Handler function for this route.
   */
  handler: RouteHandler;

  /**
   * Optional name for the route.
   */
  name?: string;

  /**
   * Middleware to apply to this route.
   */
  middleware?: string[];
}

/**
 * Result of matching a route.
 */
export interface RouteMatch {
  /**
   * The matched route definition.
   */
  route: RouteDefinition;

  /**
   * Parameters extracted from the URL.
   */
  params: RouteParams;
}

/**
 * Options for a route group.
 */
export interface RouteGroupOptions {
  /**
   * Prefix to apply to all routes in the group.
   */
  prefix?: string;

  /**
   * Middleware to apply to all routes in the group.
   */
  middleware?: string[];
}
