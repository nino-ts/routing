/**
 * Unit tests for Router.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from 'bun:test';
import { Router } from '@/router.ts';
import { createMockHandler, createParamsEchoHandler } from '@/tests/setup';

describe('Router', () => {
  describe('HTTP methods', () => {
    test('should register GET route', () => {
      const router = new Router();
      const handler = createMockHandler();

      router.get('/users', handler);

      const match = router.match('GET', '/users');
      expect(match).toBeDefined();
      expect(match?.route.method).toBe('GET');
      expect(match?.route.path).toBe('/users');
    });

    test('should register POST route', () => {
      const router = new Router();
      const handler = createMockHandler();

      router.post('/users', handler);

      const match = router.match('POST', '/users');
      expect(match).toBeDefined();
      expect(match?.route.method).toBe('POST');
    });

    test('should register PUT route', () => {
      const router = new Router();
      const handler = createMockHandler();

      router.put('/users/:id', handler);

      const match = router.match('PUT', '/users/123');
      expect(match).toBeDefined();
      expect(match?.route.method).toBe('PUT');
    });

    test('should register PATCH route', () => {
      const router = new Router();
      const handler = createMockHandler();

      router.patch('/users/:id', handler);

      const match = router.match('PATCH', '/users/123');
      expect(match).toBeDefined();
      expect(match?.route.method).toBe('PATCH');
    });

    test('should register DELETE route', () => {
      const router = new Router();
      const handler = createMockHandler();

      router.delete('/users/:id', handler);

      const match = router.match('DELETE', '/users/123');
      expect(match).toBeDefined();
      expect(match?.route.method).toBe('DELETE');
    });
  });

  describe('match()', () => {
    test('should match exact path', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('GET', '/users');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({});
    });

    test('should extract single parameter', () => {
      const router = new Router();
      router.get('/users/:id', createParamsEchoHandler());

      const match = router.match('GET', '/users/123');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({ id: '123' });
    });

    test('should extract multiple parameters', () => {
      const router = new Router();
      router.get('/users/:userId/posts/:postId', createParamsEchoHandler());

      const match = router.match('GET', '/users/10/posts/42');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({ postId: '42', userId: '10' });
    });

    test('should return undefined for non-matching path', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('GET', '/posts');

      expect(match).toBeUndefined();
    });

    test('should return undefined for non-matching method', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('POST', '/users');

      expect(match).toBeUndefined();
    });

    test('should be case-insensitive for method', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('get', '/users');

      expect(match).toBeDefined();
    });

    test('should ignore query string', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('GET', '/users?page=1&limit=10');

      expect(match).toBeDefined();
    });

    test('should ignore trailing slash', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('GET', '/users/');

      expect(match).toBeDefined();
    });
  });

  describe('named routes', () => {
    test('should register named route', () => {
      const router = new Router();

      router.get('/login', createMockHandler()).name('auth.login');

      const route = router.getRouteByName('auth.login');
      expect(route).toBeDefined();
      expect(route?.getPath()).toBe('/login');
    });

    test('should generate URL for named route', () => {
      const router = new Router();
      router.get('/users/:id', createMockHandler()).name('users.show');

      const url = router.url('users.show', { id: '123' });

      expect(url).toBe('/users/123');
    });

    test('should throw error for unknown named route', () => {
      const router = new Router();

      expect(() => router.url('unknown.route')).toThrow('Route not found: unknown.route');
    });
  });

  describe('groups', () => {
    test('should apply prefix to routes', () => {
      const router = new Router();

      router.group({ prefix: '/api' }, () => {
        router.get('/users', createMockHandler());
      });

      const match = router.match('GET', '/api/users');
      expect(match).toBeDefined();
      expect(match?.route.path).toBe('/api/users');
    });

    test('should apply nested prefixes', () => {
      const router = new Router();

      router.group({ prefix: '/api' }, () => {
        router.group({ prefix: '/v1' }, () => {
          router.get('/users', createMockHandler());
        });
      });

      const match = router.match('GET', '/api/v1/users');
      expect(match).toBeDefined();
      expect(match?.route.path).toBe('/api/v1/users');
    });

    test('should apply middleware to routes', () => {
      const router = new Router();

      router.group({ middleware: ['auth'] }, () => {
        router.get('/profile', createMockHandler());
      });

      const match = router.match('GET', '/profile');
      expect(match?.route.middleware).toContain('auth');
    });

    test('should combine group and route middleware', () => {
      const router = new Router();

      router.group({ middleware: ['auth'] }, () => {
        router.get('/admin', createMockHandler()).middleware(['admin']);
      });

      const match = router.match('GET', '/admin');
      expect(match?.route.middleware).toContain('auth');
      expect(match?.route.middleware).toContain('admin');
    });
  });

  describe('getRoutes()', () => {
    test('should return all registered routes', () => {
      const router = new Router();
      router.get('/users', createMockHandler());
      router.post('/users', createMockHandler());
      router.get('/posts', createMockHandler());

      const routes = router.getRoutes();

      expect(routes.length).toBe(3);
    });
  });

  describe('HEAD method', () => {
    test('should register HEAD route', () => {
      const router = new Router();
      const handler = createMockHandler();

      router.head('/status', handler);

      const match = router.match('HEAD', '/status');
      expect(match).toBeDefined();
      expect(match?.route.method).toBe('HEAD');
      expect(match?.route.path).toBe('/status');
    });

    test('should match HEAD route with parameters', () => {
      const router = new Router();
      router.head('/users/:id', createParamsEchoHandler());

      const match = router.match('HEAD', '/users/123');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({ id: '123' });
    });

    test('should return undefined when HEAD route does not exist', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('HEAD', '/users');

      expect(match).toBeUndefined();
    });
  });

  describe('URL encoding', () => {
    test('should decode parameter with spaces', () => {
      const router = new Router();
      router.get('/users/:name', createParamsEchoHandler());

      const match = router.match('GET', '/users/john%20doe');

      expect(match).toBeDefined();
      expect(match?.params.name).toBe('john doe');
    });

    test('should decode parameter with Unicode characters', () => {
      const router = new Router();
      router.get('/posts/:title', createParamsEchoHandler());

      const match = router.match('GET', '/posts/%E6%97%A5%E6%9C%AC%E8%AA%9E');

      expect(match).toBeDefined();
      expect(match?.params.title).toBe('日本語');
    });

    test('should decode parameter with special characters', () => {
      const router = new Router();
      router.get('/files/:path', createParamsEchoHandler());

      const match = router.match('GET', '/files/%2Fpath%2Fto%2Ffile');

      expect(match).toBeDefined();
      expect(match?.params.path).toBe('/path/to/file');
    });

    test('should decode multiple encoded parameters', () => {
      const router = new Router();
      router.get('/search/:category/:query', createParamsEchoHandler());

      const match = router.match('GET', '/search/blog%20posts/hello%20world');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({
        category: 'blog posts',
        query: 'hello world',
      });
    });
  });

  describe('edge cases', () => {
    test('should handle root path correctly', () => {
      const router = new Router();
      router.get('/', createMockHandler());

      const match = router.match('GET', '/');

      expect(match).toBeDefined();
      expect(match?.route.path).toBe('/');
    });

    test('should normalize trailing slash for root path', () => {
      const router = new Router();
      router.get('/', createMockHandler());

      const match = router.match('GET', '/');

      expect(match).toBeDefined();
    });

    test('should handle paths with multiple consecutive slashes', () => {
      const router = new Router();
      router.get('/users', createMockHandler());

      const match = router.match('GET', '//users');

      // Should normalize to /users
      expect(match).toBeDefined();
    });

    test('should support OPTIONS method', () => {
      const router = new Router();
      const handler = createMockHandler();

      router.options('/api', handler);

      const match = router.match('OPTIONS', '/api');
      expect(match).toBeDefined();
      expect(match?.route.method).toBe('OPTIONS');
    });

    test('should handle URL with fragment identifier', () => {
      const router = new Router();
      router.get('/about', createMockHandler());

      const match = router.match('GET', '/about#section');

      // Fragment should be ignored, match should succeed
      expect(match).toBeDefined();
    });
  });
});
