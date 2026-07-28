/**
 * Unit tests for routes auto-hook helpers (no long-running fs.watch in CI).
 *
 * @packageDocumentation
 */

import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    compileRouteRegistryArtifact,
    emitRouteRegistry,
    Router,
    shouldIgnoreWatchPath,
    startRoutesAutoHook,
    writeRouteRegistryIfChanged,
} from "../../index";
import { createMockHandler } from "../setup";

describe("shouldIgnoreWatchPath()", () => {
    test("ignores null, undefined, and empty filename", () => {
        expect(shouldIgnoreWatchPath(null)).toBe(true);
        expect(shouldIgnoreWatchPath(undefined)).toBe(true);
        expect(shouldIgnoreWatchPath("")).toBe(true);
    });

    test("ignores .d.ts events (anti-loop)", () => {
        expect(shouldIgnoreWatchPath("routes.d.ts")).toBe(true);
        expect(shouldIgnoreWatchPath("types/routes.d.ts")).toBe(true);
        expect(shouldIgnoreWatchPath("nested\\routes.d.ts")).toBe(true);
    });

    test("allows route source files", () => {
        expect(shouldIgnoreWatchPath("web.ts")).toBe(false);
        expect(shouldIgnoreWatchPath("api.ts")).toBe(false);
        expect(shouldIgnoreWatchPath("Modules/Blog/routes.ts")).toBe(false);
    });
});

describe("writeRouteRegistryIfChanged() / compileRouteRegistryArtifact()", () => {
    let tempRoot: string;

    afterEach(async () => {
        if (tempRoot !== undefined) {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });

    test("writes when content is new; skips when identical", async () => {
        tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-hook-"));
        const outPath = join(tempRoot, "routes.d.ts");

        const first =
            '// Generated\ndeclare module "@ninots/routing" {\n    interface RouteRegistry {\n        "home": Record<never, never>;\n    }\n}\n';
        expect(await writeRouteRegistryIfChanged(outPath, first)).toBe(true);
        expect(await Bun.file(outPath).text()).toBe(first);

        expect(await writeRouteRegistryIfChanged(outPath, first)).toBe(false);

        const second = first.replace('"home"', '"about"');
        expect(await writeRouteRegistryIfChanged(outPath, second)).toBe(true);
        expect(await Bun.file(outPath).text()).toBe(second);
    });

    test("skips write when on-disk content differs only by CRLF", async () => {
        tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-hook-"));
        const outPath = join(tempRoot, "routes.d.ts");

        const lf =
            '// Generated\ndeclare module "@ninots/routing" {\n    interface RouteRegistry {\n        "home": Record<never, never>;\n    }\n}\n';
        const crlf = lf.replace(/\n/g, "\r\n");
        await Bun.write(outPath, crlf);

        expect(await writeRouteRegistryIfChanged(outPath, lf)).toBe(false);
        // Disk may still be CRLF; next write of LF content that differs must still work
        const changed = lf.replace('"home"', '"about"');
        expect(await writeRouteRegistryIfChanged(outPath, changed)).toBe(true);
        expect(await Bun.file(outPath).text()).toBe(changed);
        expect(await Bun.file(outPath).text()).not.toContain("\r");
    });

    test("compile: route added changes artifact; unchanged skips write", async () => {
        tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-hook-"));
        const outPath = join(tempRoot, "types", "routes.d.ts");
        await mkdir(join(tempRoot, "types"), { recursive: true });

        const router = new Router();
        router.get("/", createMockHandler()).name("home");

        const first = await compileRouteRegistryArtifact({
            resolveRouter: () => router,
            outPath,
        });
        expect(first).toBe("written");
        const afterHome = await Bun.file(outPath).text();
        expect(afterHome).toContain('"home"');

        const unchanged = await compileRouteRegistryArtifact({
            resolveRouter: () => router,
            outPath,
        });
        expect(unchanged).toBe("unchanged");

        router.get("/users/:id", createMockHandler()).name("users.show");
        const added = await compileRouteRegistryArtifact({
            resolveRouter: () => router,
            outPath,
        });
        expect(added).toBe("written");
        const afterUsers = await Bun.file(outPath).text();
        expect(afterUsers).toContain('"users.show"');
        expect(afterUsers).not.toBe(afterHome);
    });

    test("compile: route removed changes artifact", async () => {
        tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-hook-"));
        const outPath = join(tempRoot, "routes.d.ts");

        const router = new Router();
        router.get("/", createMockHandler()).name("home");
        router.get("/about", createMockHandler()).name("about");

        await compileRouteRegistryArtifact({ resolveRouter: () => router, outPath });
        const withBoth = await Bun.file(outPath).text();
        expect(withBoth).toContain('"about"');

        const slim = new Router();
        slim.get("/", createMockHandler()).name("home");

        const removed = await compileRouteRegistryArtifact({
            resolveRouter: () => slim,
            outPath,
        });
        expect(removed).toBe("written");
        const after = await Bun.file(outPath).text();
        expect(after).toContain('"home"');
        expect(after).not.toContain('"about"');
        expect(after).toBe(emitRouteRegistry(slim.getRoutes()));
    });

    test("compile: resolveRouter error propagates (caller try/catch warns)", async () => {
        tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-hook-"));
        const outPath = join(tempRoot, "routes.d.ts");

        await expect(
            compileRouteRegistryArtifact({
                resolveRouter: () => {
                    throw new Error("bootstrap failed");
                },
                outPath,
            }),
        ).rejects.toThrow("bootstrap failed");
    });
});

describe("startRoutesAutoHook() resilience (no long-running watch)", () => {
    test("returns immediately when signal already aborted", async () => {
        const controller = new AbortController();
        controller.abort();

        const resolveRouter = mock(() => new Router());

        await startRoutesAutoHook({
            routesDirs: ["routes"],
            resolveRouter,
            signal: controller.signal,
            debounceMs: 10,
        });

        expect(resolveRouter).not.toHaveBeenCalled();
    });

    test("warns on resolveRouter failure and does not reject", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-watch-"));
        const warnings: string[] = [];
        const controller = new AbortController();

        try {
            const hookDone = startRoutesAutoHook({
                routesDirs: [tempRoot],
                outPath: join(tempRoot, "out.d.ts"),
                resolveRouter: () => {
                    throw new Error("bootstrap failed");
                },
                signal: controller.signal,
                debounceMs: 30,
                onWarn: (message) => {
                    warnings.push(message);
                },
            });

            await Bun.write(join(tempRoot, "web.ts"), "export {};\n");
            await Bun.sleep(120);
            controller.abort();
            await hookDone;

            expect(warnings.some((message) => message.includes("bootstrap failed"))).toBe(true);
        } finally {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });

    test("compileArtifact overrides resolveRouter+emit on debounce", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-compile-artifact-"));
        const written: string[] = [];
        const controller = new AbortController();
        const resolveRouter = mock(() => new Router());
        const compileArtifact = mock(async (): Promise<"written" | "unchanged"> => "written");

        try {
            const hookDone = startRoutesAutoHook({
                routesDirs: [tempRoot],
                outPath: join(tempRoot, "out.d.ts"),
                resolveRouter,
                compileArtifact,
                signal: controller.signal,
                debounceMs: 30,
                onWritten: (rel) => {
                    written.push(rel);
                },
            });

            await Bun.write(join(tempRoot, "web.ts"), "export {};\n");
            await Bun.sleep(120);
            controller.abort();
            await hookDone;

            expect(compileArtifact).toHaveBeenCalled();
            expect(resolveRouter).not.toHaveBeenCalled();
            expect(written.length).toBeGreaterThan(0);
        } finally {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });

    test("compileArtifact unchanged skips onWritten; errors warn without reject", async () => {
        const tempRoot = await mkdtemp(join(tmpdir(), "ninots-routes-compile-artifact-err-"));
        const written: string[] = [];
        const warnings: string[] = [];
        const controller = new AbortController();
        let calls = 0;

        try {
            const hookDone = startRoutesAutoHook({
                routesDirs: [tempRoot],
                outPath: join(tempRoot, "out.d.ts"),
                resolveRouter: () => new Router(),
                compileArtifact: async () => {
                    calls += 1;
                    if (calls === 1) {
                        return "unchanged";
                    }
                    throw new Error("spawn failed");
                },
                signal: controller.signal,
                debounceMs: 30,
                onWritten: (rel) => {
                    written.push(rel);
                },
                onWarn: (message) => {
                    warnings.push(message);
                },
            });

            await Bun.write(join(tempRoot, "web.ts"), "export {};\n");
            await Bun.sleep(120);
            await Bun.write(join(tempRoot, "api.ts"), "export {};\n");
            await Bun.sleep(120);
            controller.abort();
            await hookDone;

            expect(written).toEqual([]);
            expect(warnings.some((message) => message.includes("spawn failed"))).toBe(true);
        } finally {
            await rm(tempRoot, { recursive: true, force: true });
        }
    });
});
