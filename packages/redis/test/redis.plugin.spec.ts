import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { RedisPlugin } from "../src/redis.plugin";
import { container, type KarinApplication } from "@karin-js/core";
import { Redis } from "ioredis";
import { REDIS_CLIENT_TOKEN } from "../src/decorators";

// Mock ioredis
mock.module("ioredis", () => {
    return {
        Redis: class MockRedis {
            public status = "wait";
            public options: any;
            private handlers: Record<string, Function> = {};

            constructor(arg1?: any, arg2?: any) {
                this.options = typeof arg1 === "object" ? arg1 : arg2 || {};
                if (typeof arg1 === "string") {
                    (this as any).url = arg1;
                }
            }

            on(event: string, handler: Function) {
                this.handlers[event] = handler;
                return this;
            }

            async connect() {
                this.status = "ready";
                return Promise.resolve();
            }

            async quit() {
                this.status = "end";
                return Promise.resolve();
            }

            disconnect() {
                this.status = "end";
            }
        },
    };
});

describe("RedisPlugin", () => {
    let appMock: KarinApplication;
    let logSpy: any;
    let warnSpy: any;
    let errorSpy: any;

    beforeEach(() => {
        appMock = {
            getRootPath: () => process.cwd(),
        } as any;

        // Silence console
        logSpy = spyOn(console, "log").mockImplementation(() => { });
        warnSpy = spyOn(console, "warn").mockImplementation(() => { });
        errorSpy = spyOn(console, "error").mockImplementation(() => { });

        // Clear container (optional, but good practice if we could)
    });

    afterEach(() => {
        if (logSpy) logSpy.mockRestore();
        if (warnSpy) warnSpy.mockRestore();
        if (errorSpy) errorSpy.mockRestore();
    });

    it("should be defined", () => {
        const plugin = new RedisPlugin("redis://localhost:6379");
        expect(plugin).toBeDefined();
    });

    it("should initialize with string config", () => {
        const plugin = new RedisPlugin("redis://localhost:6379");
        plugin.install(appMock);

        const client = container.resolve(REDIS_CLIENT_TOKEN);
        expect(client).toBeDefined();
        expect((client as any).url).toBe("redis://localhost:6379");
    });

    it("should initialize with object config (url + options)", () => {
        const plugin = new RedisPlugin({
            url: "redis://localhost:6379",
            options: { db: 1 }
        });
        plugin.install(appMock);

        const client = container.resolve(REDIS_CLIENT_TOKEN) as any;
        expect(client).toBeDefined();
        expect(client.url).toBe("redis://localhost:6379");
        expect(client.options.db).toBe(1);
    });

    it("should initialize with direct RedisOptions", () => {
        const plugin = new RedisPlugin({ host: "localhost", port: 6380 });
        plugin.install(appMock);

        const client = container.resolve(REDIS_CLIENT_TOKEN) as any;
        expect(client).toBeDefined();
        expect(client.options.host).toBe("localhost");
        expect(client.options.port).toBe(6380);
    });

    it("should connect on init", async () => {
        const plugin = new RedisPlugin("redis://localhost:6379");

        // Spy on connect method of the client instance
        // Since client is private, we can access it via container after install
        plugin.install(appMock);
        const client = container.resolve(REDIS_CLIENT_TOKEN) as any;
        const connectSpy = spyOn(client, "connect");

        await plugin.onPluginInit();

        expect(connectSpy).toHaveBeenCalled();
        expect(client.status).toBe("ready");
    });

    it("should fail startup if connection fails and strategy is 'fail'", async () => {
        const plugin = new RedisPlugin({
            url: "redis://localhost:6379",
            failureStrategy: "fail"
        });
        plugin.install(appMock);
        const client = container.resolve(REDIS_CLIENT_TOKEN) as any;

        // Mock connect to throw
        client.connect = mock(() => Promise.reject(new Error("Connection refused")));

        expect(plugin.onPluginInit()).rejects.toThrow("Connection refused");

        // Logger.error uses console.log for the main message
        expect(logSpy).toHaveBeenCalled();
        const calls = logSpy.mock.calls.map((c: any) => c[0]).join(" ");
        expect(calls).toContain("ERR");
        expect(calls).toContain("Connection refused");
    });

    it("should warn and continue if connection fails and strategy is 'warn'", async () => {
        const plugin = new RedisPlugin({
            url: "redis://localhost:6379",
            failureStrategy: "warn"
        });
        plugin.install(appMock);
        const client = container.resolve(REDIS_CLIENT_TOKEN) as any;

        // Mock connect to throw
        client.connect = mock(() => Promise.reject(new Error("Connection refused")));

        await plugin.onPluginInit(); // Should not throw

        // Logger uses console.log for warn too in our implementation? 
        // Let's check both or just logSpy since Logger.warn calls print with WARN level
        // which uses console.log
        expect(logSpy).toHaveBeenCalled();
        const calls = logSpy.mock.calls.map((c: any) => c[0]).join(" ");
        expect(calls).toContain("WARN");
        expect(calls).toContain("App continuing without Redis");
    });

    it("should disconnect on destroy", async () => {
        const plugin = new RedisPlugin("redis://localhost:6379");
        plugin.install(appMock);
        const client = container.resolve(REDIS_CLIENT_TOKEN) as any;

        await plugin.onPluginInit(); // Connects -> status ready

        const quitSpy = spyOn(client, "quit");
        await plugin.onPluginDestroy();

        expect(quitSpy).toHaveBeenCalled();
        expect(client.status).toBe("end");
    });
});
