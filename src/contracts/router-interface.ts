import type { Route } from '@/route.ts';
import type { RouteGroupOptions, RouteHandler, RouteMatch } from '@/types.ts';

/**
 * Contract for the Router.
 */
export interface RouterInterface {
  get(path: string, handler: RouteHandler): Route;
  post(path: string, handler: RouteHandler): Route;
  put(path: string, handler: RouteHandler): Route;
  patch(path: string, handler: RouteHandler): Route;
  delete(path: string, handler: RouteHandler): Route;
  head(path: string, handler: RouteHandler): Route;
  options(path: string, handler: RouteHandler): Route;

  group(options: RouteGroupOptions, callback: () => void): void;
  match(method: string, path: string): RouteMatch | undefined;
  url(name: string, params?: Record<string, string>): string;
  getRoutes(): Route[];
}
