/**
 * Route class for fluent route building.
 *
 * @packageDocumentation
 */

import type { HttpMethod, RouteDefinition, RouteHandler } from '@/types.ts';

/**
 * Represents a single route with fluent methods for configuration.
 *
 * @example
 * ```typescript
 * const route = new Route('GET', '/users', handler);
 * route.name('users.index').middleware(['auth']);
 * ```
 */
export class Route {
  /**
   * The route definition.
   */
  private definition: RouteDefinition;

  /**
   * Creates a new Route instance.
   *
   * @param method - HTTP method
   * @param path - URL path pattern
   * @param handler - Route handler function
   */
  constructor(method: HttpMethod, path: string, handler: RouteHandler) {
    this.definition = {
      handler,
      method,
      middleware: [],
      path,
    };
  }

  /**
   * Set the name of this route.
   *
   * @param routeName - The route name
   * @returns This route for chaining
   *
   * @example
   * ```typescript
   * router.get('/login', handler).name('auth.login');
   * ```
   */
  name(routeName: string): this {
    this.definition.name = routeName;
    return this;
  }

  /**
   * Add middleware to this route.
   *
   * @param middlewareNames - Middleware names to add
   * @returns This route for chaining
   *
   * @example
   * ```typescript
   * router.get('/profile', handler).middleware(['auth', 'verified']);
   * ```
   */
  middleware(middlewareNames: string[]): this {
    this.definition.middleware = [...(this.definition.middleware ?? []), ...middlewareNames];
    return this;
  }

  /**
   * Get the route definition.
   *
   * @returns The complete route definition
   */
  getDefinition(): RouteDefinition {
    return this.definition;
  }

  /**
   * Get the route path.
   *
   * @returns The route path
   */
  getPath(): string {
    return this.definition.path;
  }

  /**
   * Get the route method.
   *
   * @returns The HTTP method
   */
  getMethod(): HttpMethod {
    return this.definition.method;
  }

  /**
   * Get the route name.
   *
   * @returns The route name or undefined
   */
  getName(): string | undefined {
    return this.definition.name;
  }

  /**
   * Get the route handler.
   *
   * @returns The handler function
   */
  getHandler(): RouteHandler {
    return this.definition.handler;
  }

  /**
   * Get the route middleware.
   *
   * @returns Array of middleware names
   */
  getMiddleware(): string[] {
    return this.definition.middleware ?? [];
  }
}
