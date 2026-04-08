import { afterEach, describe, expect, it, vi } from "vitest";
import type { ManifestEntry, ManifestJson } from "./manifestJson";
import { resolveManifest } from "./manifestJson";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function manifest(
    modules: ManifestEntry[],
    extras: Partial<ManifestJson> = {},
): ManifestJson {
    return { version: "1.0.0", modules, ...extras };
}

function entry(id: string, extras: Partial<ManifestEntry> = {}): ManifestEntry {
    return { id, path: `@/modules/${id}`, ...extras };
}

function mockFetch(responses: Record<string, ManifestJson>) {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const key = String(url);
        if (key in responses) {
            return {
                ok: true,
                json: () => Promise.resolve(responses[key]),
            } as Response;
        }
        return { ok: false, statusText: "Not Found" } as Response;
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// No includes — passes straight through
// ---------------------------------------------------------------------------

describe("resolveManifest — no includes", () => {
    it("returns the manifest unchanged when there are no includes", async () => {
        mockFetch({
            "/modules.json": manifest([entry("chat"), entry("auth")]),
        });

        const result = await resolveManifest("/modules.json");

        expect(result.version).toBe("1.0.0");
        expect(result.modules.map((m) => m.id)).toEqual(["chat", "auth"]);
    });

    it("returns an empty module list when root has no modules and no includes", async () => {
        mockFetch({ "/modules.json": manifest([]) });

        const result = await resolveManifest("/modules.json");

        expect(result.modules).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Basic include merging
// ---------------------------------------------------------------------------

describe("resolveManifest — includes", () => {
    it("adds modules from an included file that do not collide", async () => {
        mockFetch({
            "/modules.json": manifest([entry("chat")], {
                includes: [{ path: "/base.json" }],
            }),
            "/base.json": manifest([entry("auth")]),
        });

        const result = await resolveManifest("/modules.json");

        expect(result.modules.map((m) => m.id)).toContain("chat");
        expect(result.modules.map((m) => m.id)).toContain("auth");
    });

    it("root modules win over included modules (applied last)", async () => {
        mockFetch({
            "/modules.json": manifest(
                [entry("chat", { path: "@/modules/chat-root" })],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([
                entry("chat", { path: "@/modules/chat-base" }),
            ]),
        });

        const result = await resolveManifest("/modules.json");

        const chatModule = result.modules.find((m) => m.id === "chat");
        expect(chatModule?.path).toBe("@/modules/chat-root");
    });

    it("strips collisionStrategy from all entries in the result", async () => {
        mockFetch({
            "/modules.json": manifest(
                [entry("chat", { collisionStrategy: "replace" })],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([entry("other")]),
        });

        const result = await resolveManifest("/modules.json");

        for (const mod of result.modules) {
            expect(mod.collisionStrategy).toBeUndefined();
        }
    });
});

// ---------------------------------------------------------------------------
// Collision strategies
// ---------------------------------------------------------------------------

describe("resolveManifest — collisionStrategy", () => {
    it("merge (default): incoming wins on shared fields, base-only keys survive", async () => {
        mockFetch({
            "/modules.json": manifest(
                [
                    entry("svc", {
                        config: { rootKey: 1 },
                    }),
                ],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([
                entry("svc", {
                    config: { baseKey: 2, rootKey: 99 },
                }),
            ]),
        });

        const result = await resolveManifest("/modules.json");
        const svc = result.modules.find((m) => m.id === "svc");

        expect(svc?.config).toEqual({ rootKey: 1, baseKey: 2 });
    });

    it("merge: deeply merges nested config objects", async () => {
        mockFetch({
            "/modules.json": manifest(
                [entry("svc", { config: { nested: { a: 1, c: 3 } } })],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([
                entry("svc", { config: { nested: { a: 99, b: 2 } } }),
            ]),
        });

        const result = await resolveManifest("/modules.json");
        const svc = result.modules.find((m) => m.id === "svc");

        expect(svc?.config).toEqual({ nested: { a: 1, b: 2, c: 3 } });
    });

    it("merge: merges dependencies records, incoming wins on key collision", async () => {
        mockFetch({
            "/modules.json": manifest(
                [
                    entry("chat", {
                        dependencies: {
                            "module:svc": "chat-service-v2",
                            "module:router": "router",
                        },
                    }),
                ],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([
                entry("chat", {
                    dependencies: {
                        "module:svc": "chat-service-v1",
                        "module:sidebar": "sidebar",
                    },
                }),
            ]),
        });

        const result = await resolveManifest("/modules.json");
        const chat = result.modules.find((m) => m.id === "chat");

        expect(chat?.dependencies).toEqual({
            "module:svc": "chat-service-v2",
            "module:router": "router",
            "module:sidebar": "sidebar",
        });
    });

    it("replace: incoming entry fully replaces the included one", async () => {
        mockFetch({
            "/modules.json": manifest(
                [
                    entry("svc", {
                        path: "@/modules/svc-root",
                        config: { key: "root" },
                        collisionStrategy: "replace",
                    }),
                ],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([
                entry("svc", {
                    path: "@/modules/svc-base",
                    config: { key: "base", extraKey: "kept_by_base" },
                }),
            ]),
        });

        const result = await resolveManifest("/modules.json");
        const svc = result.modules.find((m) => m.id === "svc");

        expect(svc?.path).toBe("@/modules/svc-root");
        expect(svc?.config).toEqual({ key: "root" });
    });

    it("drop: removes the existing entry and does not add the incoming one", async () => {
        mockFetch({
            "/modules.json": manifest(
                [entry("legacy", { collisionStrategy: "drop" })],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([entry("legacy"), entry("other")]),
        });

        const result = await resolveManifest("/modules.json");
        const ids = result.modules.map((m) => m.id);

        expect(ids).not.toContain("legacy");
        expect(ids).toContain("other");
    });

    it("drop on a new id (not from includes) has no effect (nothing to drop)", async () => {
        mockFetch({
            "/modules.json": manifest(
                [entry("ghost", { collisionStrategy: "drop" })],
                { includes: [{ path: "/base.json" }] },
            ),
            "/base.json": manifest([entry("other")]),
        });

        const result = await resolveManifest("/modules.json");
        const ids = result.modules.map((m) => m.id);

        expect(ids).not.toContain("ghost");
        expect(ids).toContain("other");
    });
});

// ---------------------------------------------------------------------------
// Multiple includes — load order
// ---------------------------------------------------------------------------

describe("resolveManifest — multiple includes", () => {
    it("later include wins over earlier on collision", async () => {
        mockFetch({
            "/modules.json": manifest([], {
                includes: [{ path: "/first.json" }, { path: "/second.json" }],
            }),
            "/first.json": manifest([
                entry("svc", { path: "@/modules/svc-first" }),
            ]),
            "/second.json": manifest([
                entry("svc", { path: "@/modules/svc-second" }),
            ]),
        });

        const result = await resolveManifest("/modules.json");
        const svc = result.modules.find((m) => m.id === "svc");

        expect(svc?.path).toBe("@/modules/svc-second");
    });

    it("root still wins over all includes regardless of order", async () => {
        mockFetch({
            "/modules.json": manifest(
                [entry("svc", { path: "@/modules/svc-root" })],
                {
                    includes: [
                        { path: "/first.json" },
                        { path: "/second.json" },
                    ],
                },
            ),
            "/first.json": manifest([
                entry("svc", { path: "@/modules/svc-first" }),
            ]),
            "/second.json": manifest([
                entry("svc", { path: "@/modules/svc-second" }),
            ]),
        });

        const result = await resolveManifest("/modules.json");
        const svc = result.modules.find((m) => m.id === "svc");

        expect(svc?.path).toBe("@/modules/svc-root");
    });
});

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

describe("resolveManifest — include path resolution", () => {
    it("resolves absolute include paths as-is", async () => {
        mockFetch({
            "/manifests/root.json": manifest([entry("root-mod")], {
                includes: [{ path: "/shared/base.json" }],
            }),
            "/shared/base.json": manifest([entry("base-mod")]),
        });

        const result = await resolveManifest("/manifests/root.json");
        const ids = result.modules.map((m) => m.id);

        expect(ids).toContain("base-mod");
        expect(ids).toContain("root-mod");
    });

    it("resolves relative include paths relative to the manifest directory", async () => {
        mockFetch({
            "/manifests/root.json": manifest([entry("root-mod")], {
                includes: [{ path: "base.json" }],
            }),
            "/manifests/base.json": manifest([entry("base-mod")]),
        });

        const result = await resolveManifest("/manifests/root.json");
        const ids = result.modules.map((m) => m.id);

        expect(ids).toContain("base-mod");
        expect(ids).toContain("root-mod");
    });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe("resolveManifest — error cases", () => {
    it("throws when fetch fails", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            statusText: "Internal Server Error",
        } as Response);

        await expect(resolveManifest("/modules.json")).rejects.toThrow(
            "Failed to fetch manifest",
        );
    });

    it("throws when an included file itself contains includes (nested includes)", async () => {
        mockFetch({
            "/modules.json": manifest([], {
                includes: [{ path: "/child.json" }],
            }),
            "/child.json": manifest([], {
                includes: [{ path: "/grandchild.json" }],
            }),
        });

        await expect(resolveManifest("/modules.json")).rejects.toThrow(
            "Nested includes are not supported",
        );
    });

    it("throws when an included file fetch fails", async () => {
        mockFetch({
            "/modules.json": manifest([], {
                includes: [{ path: "/missing.json" }],
            }),
        });

        await expect(resolveManifest("/modules.json")).rejects.toThrow(
            "Failed to fetch manifest",
        );
    });
});
