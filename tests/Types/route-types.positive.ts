/**
 * Positive type-level checks for RouteRegistry shapes (Expect / Equal).
 *
 * @packageDocumentation
 */

import type { RouteRegistry } from "@ninots/routing";
import type { Equal, Expect } from "./expect";

type _homeParams = Expect<Equal<RouteRegistry["home"], Record<never, never>>>;
type _usersShowParams = Expect<Equal<RouteRegistry["users.show"], { id: string }>>;

type HasRequiredParams<Name extends keyof RouteRegistry> = [keyof RouteRegistry[Name]] extends [never]
    ? false
    : true;

type _homeOptional = Expect<Equal<HasRequiredParams<"home">, false>>;
type _showRequired = Expect<Equal<HasRequiredParams<"users.show">, true>>;

export type PositiveRouteTypeChecks = [_homeParams, _usersShowParams, _homeOptional, _showRequired];
