import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { DICache } from "../../src/router/di-cache";
import { container } from "tsyringe";
import { Service } from "../../src/decorators/service";

describe("DICache", () => {
    beforeEach(() => {
        DICache.clear();
        container.clearInstances();
    });

    afterEach(() => {
        DICache.clear();
        container.clearInstances();
    });

    describe("resolve()", () => {
        it("should resolve and cache a class instance", () => {
            @Service()
            class TestService {
                value = "test";
            }

            const instance1 = DICache.resolve(TestService);
            const instance2 = DICache.resolve(TestService);

            expect(instance1).toBeInstanceOf(TestService);
            expect(instance1).toBe(instance2); // Same instance (cached)
            expect(instance1.value).toBe("test");
        });

        it("should return object instances directly without caching", () => {
            const obj = { value: "direct" };
            const result = DICache.resolve(obj);

            expect(result).toBe(obj);
            expect(DICache.getStats().size).toBe(0); // Not cached
        });

        it("should resolve string tokens", () => {
            container.registerInstance("MY_TOKEN", { value: "token-value" });

            const instance1 = DICache.resolve("MY_TOKEN");
            const instance2 = DICache.resolve("MY_TOKEN");

            expect(instance1).toEqual({ value: "token-value" });
            expect(instance1).toBe(instance2); // Cached
        });

        it("should resolve symbol tokens", () => {
            const TOKEN = Symbol("TEST");
            container.registerInstance(TOKEN, { value: "symbol-value" });

            const instance1 = DICache.resolve(TOKEN);
            const instance2 = DICache.resolve(TOKEN);

            expect(instance1).toEqual({ value: "symbol-value" });
            expect(instance1).toBe(instance2); // Cached
        });
    });

    describe("warmup()", () => {
        it("should pre-resolve multiple instances", () => {
            @Service()
            class Service1 {
                name = "service1";
            }

            @Service()
            class Service2 {
                name = "service2";
            }

            @Service()
            class Service3 {
                name = "service3";
            }

            DICache.warmup([Service1, Service2, Service3]);

            const stats = DICache.getStats();
            expect(stats.size).toBe(3);
            expect(stats.keys).toContain("Service1");
            expect(stats.keys).toContain("Service2");
            expect(stats.keys).toContain("Service3");
        });

        it("should improve subsequent resolve performance", () => {
            @Service()
            class HeavyService {
                constructor() {
                    // Simulate heavy initialization
                    for (let i = 0; i < 1000; i++) {
                        Math.random();
                    }
                }
            }

            // Warmup
            DICache.warmup([HeavyService]);

            // Subsequent resolve should be instant (from cache)
            const start = performance.now();
            DICache.resolve(HeavyService);
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(1); // Should be < 1ms (cached)
        });
    });

    describe("clear()", () => {
        it("should clear all cached instances", () => {
            @Service()
            class TestService { }

            DICache.resolve(TestService);
            expect(DICache.getStats().size).toBe(1);

            DICache.clear();
            expect(DICache.getStats().size).toBe(0);
        });
    });

    describe("getStats()", () => {
        it("should return cache statistics", () => {
            @Service()
            class Service1 { }

            @Service()
            class Service2 { }

            DICache.resolve(Service1);
            DICache.resolve(Service2);

            const stats = DICache.getStats();
            expect(stats.size).toBe(2);
            expect(stats.keys).toHaveLength(2);
            expect(stats.keys).toContain("Service1");
            expect(stats.keys).toContain("Service2");
        });

        it("should handle string and symbol tokens in stats", () => {
            container.registerInstance("STRING_TOKEN", {});
            const SYMBOL_TOKEN = Symbol("TEST");
            container.registerInstance(SYMBOL_TOKEN, {});

            DICache.resolve("STRING_TOKEN");
            DICache.resolve(SYMBOL_TOKEN);

            const stats = DICache.getStats();
            expect(stats.size).toBe(2);
            expect(stats.keys).toContain("STRING_TOKEN");
            expect(stats.keys.some((k) => k.includes("Symbol"))).toBe(true);
        });
    });

    describe("Performance", () => {
        it("should be faster than direct container.resolve() for repeated calls", () => {
            @Service()
            class TestService {
                value = Math.random();
            }

            // Warmup
            DICache.resolve(TestService);

            // Measure DICache performance
            const cacheStart = performance.now();
            for (let i = 0; i < 1000; i++) {
                DICache.resolve(TestService);
            }
            const cacheDuration = performance.now() - cacheStart;

            // Clear and measure direct container.resolve performance
            DICache.clear();
            const directStart = performance.now();
            for (let i = 0; i < 1000; i++) {
                container.resolve(TestService);
            }
            const directDuration = performance.now() - directStart;

            // DICache should be significantly faster
            expect(cacheDuration).toBeLessThan(directDuration);
        });
    });
});
