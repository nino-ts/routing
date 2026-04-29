/**
 * Unit tests for Route.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from 'bun:test';
import { Route } from '@/route.ts';
import { createMockHandler } from '@/tests/setup';

describe('Route', () => {
  describe('constructor', () => {
    test('should create route with method, path, and handler', () => {
      const handler = createMockHandler();
      const route = new Route('GET', '/users', handler);

      expect(route.getMethod()).toBe('GET');
      expect(route.getPath()).toBe('/users');
      expect(route.getHandler()).toBe(handler);
    });
  });

  describe('name()', () => {
    test('should set route name', () => {
      const route = new Route('GET', '/users', createMockHandler());

      route.name('users.index');

      expect(route.getName()).toBe('users.index');
    });

    test('should return route for chaining', () => {
      const route = new Route('GET', '/users', createMockHandler());

      const result = route.name('users.index');

      expect(result).toBe(route);
    });
  });

  describe('middleware()', () => {
    test('should set middleware', () => {
      const route = new Route('GET', '/users', createMockHandler());

      route.middleware(['auth', 'verified']);

      expect(route.getMiddleware()).toEqual(['auth', 'verified']);
    });

    test('should append middleware', () => {
      const route = new Route('GET', '/users', createMockHandler());

      route.middleware(['auth']);
      route.middleware(['verified']);

      expect(route.getMiddleware()).toEqual(['auth', 'verified']);
    });

    test('should return route for chaining', () => {
      const route = new Route('GET', '/users', createMockHandler());

      const result = route.middleware(['auth']);

      expect(result).toBe(route);
    });
  });

  describe('getDefinition()', () => {
    test('should return complete route definition', () => {
      const handler = createMockHandler();
      const route = new Route('POST', '/users', handler);
      route.name('users.create').middleware(['auth']);

      const definition = route.getDefinition();

      expect(definition.method).toBe('POST');
      expect(definition.path).toBe('/users');
      expect(definition.handler).toBe(handler);
      expect(definition.name).toBe('users.create');
      expect(definition.middleware).toEqual(['auth']);
    });
  });

  describe('chaining', () => {
    test('should support fluent chaining', () => {
      const route = new Route('GET', '/profile', createMockHandler())
        .name('profile.show')
        .middleware(['auth', 'verified']);

      expect(route.getName()).toBe('profile.show');
      expect(route.getMiddleware()).toEqual(['auth', 'verified']);
    });
  });
});
