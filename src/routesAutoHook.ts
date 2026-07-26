/**
 * Dev auto-hook: watch route dirs -> debounce -> emit typed registry.
 *
 * Reuses {@link emitRouteRegistry}; never watches `types/` (anti-loop).
 *
 * @packageDocumentation
 */

import { access, constants, watch } from "node:fs/promises";
import { resolve } from "node:path";
import { emitRouteRegistry } from "./emitRouteRegistry";
import type { Router } from "./router";

const DEFAULT_OUT = "types/routes.d.ts";
const DEFAULT_DEBOUNCE_MS = 150;

export interface RoutesAutoHookOptions {
    /** Directories to watch recursively (e.g. `routes`, `app/Modules`). Never `types/`. */
    routesDirs: string[];
    /** Relative path for the `.d.ts` artifact. @default `types/routes.d.ts` */
    outPath?: string;
    /**
     * Resolve the live Router (re-called after each debounced change).
     * Ignored when {@link compileArtifact} is set.
     */
    resolveRouter: () => Router | Promise<Router>;
    /**
     * Optional compile override for the debounce path (e.g. spawn `routes:compile`
     * in a cold Bun process). When set, skips in-process `resolveRouter`+emit.
     */
    compileArtifact?: () => Promise<"written" | "unchanged">;
    /** Abort to stop all watchers (ServeCommand SIGINT/SIGTERM). */
    signal?: AbortSignal;
    /** Coalesce Windows multi-event / atomic saves. @default 150 */
    debounceMs?: number;
    /** Override warning sink (defaults to `console.warn`). */
    onWarn?: (message: string) => void;
    /** Called when the artifact was actually written. */
    onWritten?: (outRel: string) => void;
}

/**
 * True when a watch event must be ignored (empty filename or `.d.ts`).
 */
export function shouldIgnoreWatchPath(filename: string | null | undefined): boolean {
    if (filename === null || filename === undefined || filename.length === 0) {
        return true;
    }

    const normalized = filename.replace(/\\/g, "/");
    return normalized.endsWith(".d.ts");
}

/**
 * Write `content` only when it differs from the file on disk.
 *
 * @returns `true` when `Bun.write` ran
 */
export async function writeRouteRegistryIfChanged(outPath: string, content: string): Promise<boolean> {
    const existing = Bun.file(outPath);
    if (await existing.exists()) {
        const previous = await existing.text();
        if (previous === content) {
            return false;
        }
    }

    await Bun.write(outPath, content);
    return true;
}

/**
 * Resolve router -> {@link emitRouteRegistry} -> conditional write.
 *
 * Exported for unit tests (no `fs.watch`).
 */
export async function compileRouteRegistryArtifact(options: {
    resolveRouter: () => Router | Promise<Router>;
    outPath: string;
}): Promise<"written" | "unchanged"> {
    const router = await options.resolveRouter();
    const content = emitRouteRegistry(router.getRoutes());
    const wrote = await writeRouteRegistryIfChanged(options.outPath, content);
    return wrote ? "written" : "unchanged";
}

async function directoryExists(absPath: string): Promise<boolean> {
    try {
        await access(absPath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function isAbortError(error: unknown): boolean {
    if (error instanceof Error && error.name === "AbortError") {
        return true;
    }
    return typeof error === "object" && error !== null && "code" in error && error.code === "ABORT_ERR";
}

/**
 * Watch `routesDirs` and rebuild the typed route registry on change.
 *
 * Resolves when `signal` aborts (or immediately if already aborted).
 * Compile errors are logged via `onWarn` — they never reject this promise.
 */
export async function startRoutesAutoHook(options: RoutesAutoHookOptions): Promise<void> {
    const outRel = options.outPath ?? DEFAULT_OUT;
    const outPath = resolve(process.cwd(), outRel);
    const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    const warn =
        options.onWarn ??
        ((message: string): void => {
            process.stderr.write(`${message}\n`);
        });
    const onWritten =
        options.onWritten ??
        ((rel: string): void => {
            process.stdout.write(`✓ ${rel} updated\n`);
        });

    if (options.signal?.aborted) {
        return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const clearDebounce = (): void => {
        if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
            debounceTimer = undefined;
        }
    };

    const runCompile = async (): Promise<void> => {
        try {
            const result =
                options.compileArtifact !== undefined
                    ? await options.compileArtifact()
                    : await compileRouteRegistryArtifact({
                          resolveRouter: options.resolveRouter,
                          outPath,
                      });
            if (result === "written") {
                onWritten(outRel);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            warn(`routes auto-hook: ${message}`);
        }
    };

    const scheduleCompile = (): void => {
        clearDebounce();
        debounceTimer = setTimeout(() => {
            debounceTimer = undefined;
            void runCompile();
        }, debounceMs);
    };

    const onAbort = (): void => {
        clearDebounce();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    const watchDir = async (dirRel: string): Promise<void> => {
        const absDir = resolve(process.cwd(), dirRel);
        if (!(await directoryExists(absDir))) {
            warn(`routes auto-hook: skipping missing directory ${dirRel}`);
            return;
        }

        try {
            const watcher = watch(absDir, {
                recursive: true,
                signal: options.signal,
            });

            for await (const event of watcher) {
                if (shouldIgnoreWatchPath(event.filename)) {
                    continue;
                }
                scheduleCompile();
            }
        } catch (error: unknown) {
            if (options.signal?.aborted || isAbortError(error)) {
                return;
            }
            const message = error instanceof Error ? error.message : String(error);
            warn(`routes auto-hook: watcher stopped (${dirRel}): ${message}`);
        }
    };

    try {
        await Promise.all(options.routesDirs.map((dir) => watchDir(dir)));
    } finally {
        clearDebounce();
        options.signal?.removeEventListener("abort", onAbort);
    }
}
