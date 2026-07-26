/**
 * Ambient RouteRegistry used by routing type-level and unit tests.
 *
 * @packageDocumentation
 */

declare module "@ninots/routing" {
    interface RouteRegistry {
        home: Record<never, never>;
        "users.show": { id: string };
    }
}

export {};
