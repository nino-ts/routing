/**
 * Test setup for @ninots/routing.
 *
 * @packageDocumentation
 */

import type { RouteHandler } from '@/types.ts';

/**
 * Creates a mock handler that returns a JSON response.
 *
 * @param data - Data to return in the response
 * @returns A RouteHandler function
 */
export function createMockHandler(data: Record<string, unknown> = {}): RouteHandler {
  return async () => {
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

/**
 * Creates a handler that echoes route params.
 *
 * @returns A RouteHandler function
 */
export function createParamsEchoHandler(): RouteHandler {
  return async (_request, params) => {
    return new Response(JSON.stringify(params), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
