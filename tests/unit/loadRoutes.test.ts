/**
 * Unit tests for deprecated loadRoutes (file-based).
 *
 * @packageDocumentation
 */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRoutes } from "../../src/loader";
import { Router } from "../../src/router";
import { createMockHandler } from "../setup";

describe("loadRoutes", () => {
	let tempDir: string | undefined;

	afterEach(async () => {
		if (tempDir) {
			await rm(tempDir, { force: true, recursive: true });
			tempDir = undefined;
		}
	});

	test("registers method+path from Next.js-style files (happy path)", async () => {
		tempDir = await mkdtemp(join(tmpdir(), "ninots-loadroutes-happy-"));
		await writeFile(
			join(tempDir, "users.ts"),
			`export const GET = async () => new Response("users");\n`,
		);
		await mkdir(join(tempDir, "users"), { recursive: true });
		await writeFile(
			join(tempDir, "users", "[id].ts"),
			`export const GET = async () => new Response("user");\nexport const POST = async () => new Response("create");\n`,
		);

		const router = new Router();
		await loadRoutes(tempDir, router);

		const getUsers = router.match("GET", "/users");
		expect(getUsers).toBeDefined();
		expect(getUsers?.route.method).toBe("GET");
		expect(getUsers?.route.path).toBe("/users");

		const getUser = router.match("GET", "/users/42");
		expect(getUser).toBeDefined();
		expect(getUser?.route.path).toBe("/users/:id");
		expect(getUser?.params).toEqual({ id: "42" });

		const postUser = router.match("POST", "/users/42");
		expect(postUser).toBeDefined();
		expect(postUser?.route.method).toBe("POST");
	});

	test("propagates import failures", async () => {
		tempDir = await mkdtemp(join(tmpdir(), "ninots-loadroutes-import-fail-"));
		await writeFile(
			join(tempDir, "broken.ts"),
			`throw new Error("intentional import failure");\n`,
		);

		const router = new Router();
		await expect(loadRoutes(tempDir, router)).rejects.toThrow(
			"intentional import failure",
		);
	});

	test("throws on method+path collision with existing routes", async () => {
		tempDir = await mkdtemp(join(tmpdir(), "ninots-loadroutes-collision-"));
		await writeFile(
			join(tempDir, "users.ts"),
			`export const GET = async () => new Response("file");\n`,
		);

		const router = new Router();
		router.get("/users", createMockHandler({ source: "fluent" }));

		await expect(loadRoutes(tempDir, router)).rejects.toThrow(
			"Route collision: GET /users",
		);
	});
});
