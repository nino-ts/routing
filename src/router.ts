/**
 * Router class for registering and matching routes.
 *
 * @packageDocumentation
 */

import type { RouterInterface } from '@/contracts/router-interface.ts';
import { Route } from '@/route.ts';
import type { HttpMethod, RouteGroupOptions, RouteHandler, RouteMatch, RouteParams } from '@/types.ts';

/**
 * HTTP Router for registering and matching routes.
 *
 * @example
 * ```typescript
 * const router = new Router();
 *
 * router.get('/users', async (req) => {
 *   return Response.json({ users: [] });
 * });
 *
 * router.get('/users/:id', async (req, params) => {
 *   return Response.json({ id: params.id });
 * });
 *
 * const match = router.match('GET', '/users/123');
 * if (match) {
 *   const response = await match.route.handler(request, match.params);
 * }
 * ```
 */
export class Router implements RouterInterface {
  /**
   * Registered routes.
   */
  private routes: Route[] = [];

  /**
   * Named routes lookup.
   */
  private namedRoutes: Map<string, Route> = new Map();

  /**
   * Current group options stack.
   */
  private groupStack: RouteGroupOptions[] = [];

  /**
   * Register a GET route.
   *
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route for chaining
   */
  get(path: string, handler: RouteHandler): Route {
    return this.addRoute('GET', path, handler);
  }

  /**
   * Register a POST route.
   *
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route for chaining
   */
  post(path: string, handler: RouteHandler): Route {
    return this.addRoute('POST', path, handler);
  }

  /**
   * Register a PUT route.
   *
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route for chaining
   */
  put(path: string, handler: RouteHandler): Route {
    return this.addRoute('PUT', path, handler);
  }

  /**
   * Register a PATCH route.
   *
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route for chaining
   */
  patch(path: string, handler: RouteHandler): Route {
    return this.addRoute('PATCH', path, handler);
  }

  /**
   * Register a DELETE route.
   *
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route for chaining
   */
  delete(path: string, handler: RouteHandler): Route {
    return this.addRoute('DELETE', path, handler);
  }

  /**
   * Register a HEAD route.
   *
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route for chaining
   */
  head(path: string, handler: RouteHandler): Route {
    return this.addRoute('HEAD', path, handler);
  }

  /**
   * Register an OPTIONS route.
   *
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route for chaining
   */
  options(path: string, handler: RouteHandler): Route {
    return this.addRoute('OPTIONS', path, handler);
  }

  /**
   * Create a route group with shared attributes.
   *
   * @param options - Group options (prefix, middleware)
   * @param callback - Callback to register routes within the group
   *
   * @example
   * ```typescript
   * router.group({ prefix: '/api', middleware: ['auth'] }, () => {
   *   router.get('/users', handler); // /api/users with 'auth' middleware
   * });
   * ```
   */
  group(options: RouteGroupOptions, callback: () => void): void {
    this.groupStack.push(options);
    callback();
    this.groupStack.pop();
  }

  /**
   * Match a request to a route.
   *
   * @param method - HTTP method
   * @param path - Request path
   * @returns The matched route and params, or undefined if no match
   *
   * @example
   * ```typescript
   * const match = router.match('GET', '/users/123');
   * if (match) {
   *   const response = await match.route.handler(request, match.params);
   * }
   * ```
   */
  match(method: string, path: string): RouteMatch | undefined {
    const normalizedMethod = method.toUpperCase() as HttpMethod;
    const normalizedPath = this.normalizePath(path);

    for (const route of this.routes) {
      if (route.getMethod() !== normalizedMethod) {
        continue;
      }

      const params = this.matchPath(route.getPath(), normalizedPath);
      if (params !== null) {
        return {
          params,
          route: route.getDefinition(),
        };
      }
    }

    return undefined;
  }

  /**
   * Get a route by name.
   *
   * @param name - Route name
   * @returns The route or undefined
   */
  getRouteByName(name: string): Route | undefined {
    return this.namedRoutes.get(name);
  }

  /**
   * Generate a URL for a named route.
   *
   * @param name - Route name
   * @param params - Parameters to substitute in the URL
   * @returns The generated URL
   * @throws Error if route not found
   *
   * @example
   * ```typescript
   * router.get('/users/:id', handler).name('users.show');
   * const url = router.url('users.show', { id: '123' }); // '/users/123'
   * ```
   */
  url(name: string, params: RouteParams = {}): string {
    const route = this.namedRoutes.get(name);
    if (!route) {
      throw new Error(`Route not found: ${name}`);
    }

    let url = route.getPath();
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, value);
    }

    return url;
  }

  /**
   * Get all registered routes.
   *
   * @returns Array of all routes
   */
  getRoutes(): Route[] {
    return [...this.routes];
  }

  /**
   * Add a route to the router.
   *
   * @param method - HTTP method
   * @param path - URL path pattern
   * @param handler - Route handler
   * @returns The created Route
   */
  private addRoute(method: HttpMethod, path: string, handler: RouteHandler): Route {
    const fullPath = this.applyGroupPrefix(path);
    const route = new Route(method, fullPath, handler);

    // Apply group middleware
    const groupMiddleware = this.getGroupMiddleware();
    if (groupMiddleware.length > 0) {
      route.middleware(groupMiddleware);
    }

    this.routes.push(route);

    // Track named routes
    const originalName = route.name.bind(route);
    route.name = (routeName: string) => {
      const result = originalName(routeName);
      this.namedRoutes.set(routeName, route);
      return result;
    };

    return route;
  }

  /**
   * Apply group prefixes to a path.
   */
  private applyGroupPrefix(path: string): string {
    const prefixes = this.groupStack.map((g) => g.prefix).filter((p): p is string => p !== undefined);

    if (prefixes.length === 0) {
      return path;
    }

    const prefix = prefixes.join('');
    return `${prefix}${path}`;
  }

  /**
   * Get combined middleware from all groups.
   */
  private getGroupMiddleware(): string[] {
    return this.groupStack.flatMap((g) => g.middleware ?? []);
  }

  /**
   * Normalize a path for matching.
   *
   * Normalizes URLs by:
   * - Removing query strings and fragment identifiers
   * - Collapsing multiple consecutive slashes into a single slash
   * - Removing trailing slashes (except for root path)
   *
   * Uses the URL class for robust parsing when possible.
   *
   * @param path - Request path to normalize
   * @returns Normalized path
   *
   * @example
   * ```typescript
   * normalizePath('/users?page=1')     // '/users'
   * normalizePath('/users#section')    // '/users'
   * normalizePath('//users')           // '/users'
   * normalizePath('/users/')           // '/users'
   * normalizePath('/')                 // '/' (root preserved)
   * ```
   */
  private normalizePath(path: string): string {
    // First normalize multiple consecutive slashes (before URL parsing)
    // This prevents issues with protocol-relative URLs like //users
    let normalized = path.replace(/\/+/g, '/');

    try {
      // Use URL class for robust parsing (handles query strings, fragments, etc.)
      const url = new URL(normalized, 'http://localhost');
      let pathname = url.pathname;

      // Remove trailing slash (except for root)
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }

      return pathname;
    } catch {
      // Fallback for paths without protocol (relative paths)
      // Remove query string and fragment
      const withoutQuery = normalized.split('?')[0] ?? normalized;
      normalized = withoutQuery.split('#')[0] ?? withoutQuery;

      // Remove trailing slash (except for root)
      if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    }
  }

  /**
   * Match a path pattern against a request path.
   *
   * Performs segment-by-segment matching of URL paths. Parameter segments
   * (prefixed with `:`) are automatically URL-decoded to support special
   * characters, spaces, and Unicode.
   *
   * @param pattern - Route pattern (e.g., /users/:id)
   * @param path - Request path (e.g., /users/123)
   * @returns Extracted params or null if no match
   *
   * @example
   * ```typescript
   * // Static route matching
   * matchPath('/users', '/users')  // {}
   *
   * // Dynamic parameter matching
   * matchPath('/users/:id', '/users/123')  // { id: '123' }
   *
   * // URL-encoded parameters
   * matchPath('/users/:name', '/users/john%20doe')  // { name: 'john doe' }
   * matchPath('/posts/:title', '/posts/%E6%97%A5%E6%9C%AC%E8%AA%9E')  // { title: '日本語' }
   *
   * // Multiple parameters
   * matchPath('/users/:userId/posts/:postId', '/users/10/posts/42')
   * // { userId: '10', postId: '42' }
   *
   * // No match
   * matchPath('/users/:id', '/posts/123')  // null
   * ```
   */
  private matchPath(pattern: string, path: string): RouteParams | null {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: RouteParams = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart === undefined || pathPart === undefined) {
        return null;
      }

      if (patternPart.startsWith(':')) {
        // Parameter segment - decode URL encoding
        const paramName = patternPart.slice(1);
        try {
          params[paramName] = decodeURIComponent(pathPart);
        } catch {
          // If decoding fails, use raw value
          params[paramName] = pathPart;
        }
      } else if (patternPart !== pathPart) {
        // Static segment mismatch
        return null;
      }
    }

    return params;
  }
}
