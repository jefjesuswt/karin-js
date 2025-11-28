import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { ConfigPlugin } from "../src/config.plugin";
import { ConfigService } from "../src/config.service";
import { container, type KarinApplication } from "@karin-js/core";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

describe("ConfigPlugin", () => {
    let appMock: KarinApplication;
    const tempEnvPath = path.join(process.cwd(), ".env.test");
    let logSpy: any;
    let warnSpy: any;
    let errorSpy: any;

    beforeEach(() => {
        appMock = {
            getRootPath: () => process.cwd(),
        } as any;

        // Clean up temp env file if exists
        if (fs.existsSync(tempEnvPath)) {
            fs.unlinkSync(tempEnvPath);
        }

        // Silence console
        logSpy = spyOn(console, "log").mockImplementation(() => { });
        warnSpy = spyOn(console, "warn").mockImplementation(() => { });
        errorSpy = spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        if (fs.existsSync(tempEnvPath)) {
            fs.unlinkSync(tempEnvPath);
        }
        // Restore process.env
        delete process.env.TEST_VAR;
        delete process.env.PORT;

        logSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it("should load configuration from custom load function", () => {
        const customConfig = { FOO: "bar" };
        const plugin = new ConfigPlugin<{ FOO: string }>({
            load: () => customConfig,
        });

        plugin.install(appMock);

        expect(plugin.get("FOO")).toBe("bar");

        // Verify service is registered in container
        const service = container.resolve<ConfigService<{ FOO: string }>>(ConfigService);
        expect(service).toBeDefined();
        expect(service.get("FOO")).toBe("bar");
    });

    it("should validate configuration with Zod schema", () => {
        const schema = z.object({
            PORT: z.string().transform(Number),
        });

        process.env.PORT = "8080";

        const plugin = new ConfigPlugin({
            schema,
        });

        plugin.install(appMock);
        expect(plugin.get("PORT")).toBe(8080);
    });

    it("should throw error (exit process) if validation fails", () => {
        const schema = z.object({
            REQUIRED_VAR: z.string(),
        });

        const plugin = new ConfigPlugin({
            schema,
        });

        const originalExit = process.exit;
        const exitSpy = mock((code?: number) => {
            throw new Error(`Process exited with code ${code}`);
        });
        process.exit = exitSpy as any;

        // Error logs are already suppressed by global beforeEach

        expect(() => plugin.install(appMock)).toThrow("Process exited with code 1");

        process.exit = originalExit;
    });

    it("should load from .env file if present", () => {
        fs.writeFileSync(tempEnvPath, "TEST_VAR=hello");

        const plugin = new ConfigPlugin({
            envFilePath: tempEnvPath
        });

        plugin.install(appMock);

        // dotenv loads into process.env
        expect(process.env.TEST_VAR).toBe("hello");

        // And the service should have access to it (since it falls back to process.env if no schema/load)
        expect(plugin.get("TEST_VAR")).toBe("hello");
    });

    it("should warn if .env file is missing and required is true", () => {
        const plugin = new ConfigPlugin({
            envFilePath: "/non/existent/path/.env",
            required: true
        });

        // Spies are already set up in beforeEach

        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        plugin.install(appMock);

        // Check if either was called
        const called = logSpy.mock.calls.length > 0 || warnSpy.mock.calls.length > 0;
        expect(called).toBe(true);

        process.env.NODE_ENV = originalNodeEnv;
    });

    it("should support the bootstrap pattern (integration simulation)", () => {
        // Simulate the bootstrap flow from main.ts
        process.env.PORT = "4000";
        process.env.DB_NAME = "test_db";

        const config = new ConfigPlugin({
            load: () => ({
                port: parseInt(process.env.PORT || "3000", 10),
                dbName: process.env.DB_NAME || "default_db",
            }),
        });

        // Simulate app.use(config)
        config.install(appMock);

        // Simulate usage in another plugin (e.g. MongoosePlugin)
        const mongooseOptions = {
            dbName: config.get("dbName"),
        };

        // Simulate usage in app.listen
        const serverPort = config.get("port");

        expect(mongooseOptions.dbName).toBe("test_db");
        expect(serverPort).toBe(4000);
    });
});
