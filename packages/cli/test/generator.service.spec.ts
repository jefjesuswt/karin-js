import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { GeneratorService } from "../src/services/generator.service";
import * as fs from "fs";
import * as path from "path";

// Mock @clack/prompts
mock.module("@clack/prompts", () => {
    return {
        spinner: () => ({
            start: mock(() => { }),
            stop: mock(() => { }),
            message: mock(() => { }),
        }),
        note: mock(() => { }),
        confirm: mock(() => Promise.resolve(true)),
        isCancel: mock(() => false),
        cancel: mock(() => { }),
    };
});

// Mock utils/paths
mock.module("../src/utils/paths", () => {
    return {
        findSrcDir: (cwd: string) => path.join(cwd, "src"),
    };
});

describe("GeneratorService", () => {
    const cwd = "/test/project";
    let service: GeneratorService;
    let existsSyncSpy: any;
    let mkdirSyncSpy: any;
    let writeFileSyncSpy: any;
    let logSpy: any;

    beforeEach(() => {
        service = new GeneratorService(cwd, false);

        existsSyncSpy = spyOn(fs, "existsSync").mockReturnValue(false);
        mkdirSyncSpy = spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
        writeFileSyncSpy = spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
        logSpy = spyOn(console, "log").mockImplementation(() => { });
    });

    afterEach(() => {
        existsSyncSpy.mockRestore();
        mkdirSyncSpy.mockRestore();
        writeFileSyncSpy.mockRestore();
        logSpy.mockRestore();
    });

    it("should generate a controller", async () => {
        await service.generate("controller", "users");

        const expectedPath = path.join(cwd, "src/users/users.controller.ts");
        expect(mkdirSyncSpy).toHaveBeenCalledWith(path.join(cwd, "src/users"), { recursive: true });
        expect(writeFileSyncSpy).toHaveBeenCalledWith(expectedPath, expect.any(String));
    });

    it("should generate a service", async () => {
        await service.generate("service", "users");

        const expectedPath = path.join(cwd, "src/users/users.service.ts");
        expect(writeFileSyncSpy).toHaveBeenCalledWith(expectedPath, expect.any(String));
    });

    it("should handle dry-run", async () => {
        service = new GeneratorService(cwd, true);
        await service.generate("controller", "users");

        expect(writeFileSyncSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalled(); // Should log [DryRun]
    });

    it("should skip if file exists", async () => {
        // First call false (dir check), second call true (file check)
        existsSyncSpy.mockImplementation((p: string) => p.endsWith(".ts"));

        await service.generate("controller", "users");

        expect(writeFileSyncSpy).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalled(); // Should log SKIP
    });

    it("should generate resource (CRUD)", async () => {
        // confirm is mocked to return true by default
        await service.generate("resource", "products");

        // Should generate controller, service, entity, create-dto, update-dto
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(5);

        const calls = writeFileSyncSpy.mock.calls.map((c: any) => c[0]);
        expect(calls.some((p: string) => p.endsWith("products.controller.ts"))).toBe(true);
        expect(calls.some((p: string) => p.endsWith("products.service.ts"))).toBe(true);
        expect(calls.some((p: string) => p.endsWith("products.entity.ts"))).toBe(true);
        expect(calls.some((p: string) => p.endsWith("create-products.dto.ts"))).toBe(true);
        expect(calls.some((p: string) => p.endsWith("update-products.dto.ts"))).toBe(true);
    });
});
