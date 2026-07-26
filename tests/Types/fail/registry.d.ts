/**
 * Shared RouteRegistry for fail-fixture typechecks.
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
