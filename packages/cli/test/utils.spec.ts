import { describe, it, expect, spyOn, afterEach } from "bun:test";
import { toPascalCase, toKebabCase, removeSuffix } from "../src/utils/formatting";
import { findSrcDir } from "../src/utils/paths";
import * as fs from "fs";

describe("CLI Utils", () => {
    describe("formatting", () => {
        it("toPascalCase should convert strings correctly", () => {
            expect(toPascalCase("hello-world")).toBe("HelloWorld");
            expect(toPascalCase("user_controller")).toBe("UserController");
            expect(toPascalCase("some name")).toBe("SomeName");
        });

        it("toKebabCase should convert strings correctly", () => {
            expect(toKebabCase("HelloWorld")).toBe("hello-world");
            expect(toKebabCase("UserController")).toBe("user-controller");
            expect(toKebabCase("Some Name")).toBe("some-name");
        });

        it("removeSuffix should remove suffix case-insensitively", () => {
            expect(removeSuffix("UserController", "Controller")).toBe("User");
            expect(removeSuffix("userservice", "Service")).toBe("user");
            expect(removeSuffix("User", "Controller")).toBe("User");
        });
    });

    describe("paths", () => {
        const existsSyncSpy = spyOn(fs, "existsSync");

        afterEach(() => {
            existsSyncSpy.mockRestore();
        });

        it("findSrcDir should return src path if it exists", () => {
            existsSyncSpy.mockReturnValue(true);
            const cwd = "/test/project";
            expect(findSrcDir(cwd)).toBe("/test/project/src");
        });

        it("findSrcDir should throw error if src does not exist", () => {
            existsSyncSpy.mockReturnValue(false);
            const cwd = "/test/project";
            expect(() => findSrcDir(cwd)).toThrow("Could not find 'src' folder");
        });
    });
});
