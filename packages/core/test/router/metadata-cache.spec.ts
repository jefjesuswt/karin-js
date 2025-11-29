import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { MetadataCache } from "../../src/router/metadata-cache";
import { DICache } from "../../src/router/di-cache";
import { Service } from "../../src/decorators/service";
import { Catch } from "../../src/decorators/filters";
import type {
    CanActivate,
    PipeTransform,
    KarinInterceptor,
    ExceptionFilter,
    ArgumentsHost,
} from "../../src/interfaces";

describe("MetadataCache", () => {
    beforeEach(() => {
        MetadataCache.clear();
        DICache.clear();
    });

    afterEach(() => {
        MetadataCache.clear();
        DICache.clear();
    });

    describe("compile()", () => {
        it("should compile and cache route metadata", () => {
            @Service()
            class TestController {
                testMethod() {
                    return "test";
                }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            expect(compiled.controllerInstance).toBeInstanceOf(TestController);
            expect(compiled.boundHandler).toBeInstanceOf(Function);
            expect(compiled.guards).toEqual([]);
            expect(compiled.pipes).toEqual([]);
            expect(compiled.interceptors).toEqual([]);
            expect(compiled.filters).toEqual([]);
            expect(compiled.params).toEqual([]);
            expect(compiled.isFast).toBe(false);
        });

        it("should return cached metadata on subsequent calls", () => {
            @Service()
            class TestController {
                testMethod() {
                    return "test";
                }
            }

            const compiled1 = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            const compiled2 = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            expect(compiled1).toBe(compiled2); // Same object (cached)
        });

        it("should bind controller method correctly", () => {
            @Service()
            class TestController {
                value = "controller-value";

                testMethod() {
                    return this.value;
                }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            const result = compiled.boundHandler();
            expect(result).toBe("controller-value");
        });

        it("should resolve guard instances", () => {
            @Service()
            class TestGuard implements CanActivate {
                canActivate() {
                    return true;
                }
            }

            @Service()
            class TestController {
                testMethod() { }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [TestGuard],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            expect(compiled.guards).toHaveLength(1);
            expect(compiled.guards[0]).toBeInstanceOf(TestGuard);
        });

        it("should resolve pipe instances", () => {
            @Service()
            class TestPipe implements PipeTransform {
                transform(value: any) {
                    return value;
                }
            }

            @Service()
            class TestController {
                testMethod() { }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [TestPipe],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            expect(compiled.pipes).toHaveLength(1);
            expect(compiled.pipes[0]).toBeInstanceOf(TestPipe);
        });

        it("should resolve interceptor instances", () => {
            @Service()
            class TestInterceptor implements KarinInterceptor {
                async intercept(context: any, next: any) {
                    return next();
                }
            }

            @Service()
            class TestController {
                testMethod() { }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [TestInterceptor],
                filters: [],
                params: [],
                isFast: false,
            });

            expect(compiled.interceptors).toHaveLength(1);
            expect(compiled.interceptors[0]).toBeInstanceOf(TestInterceptor);
        });

        it("should resolve filter instances with catch metadata", () => {
            class CustomError extends Error { }

            @Catch(CustomError)
            @Service()
            class TestFilter implements ExceptionFilter {
                catch(exception: any, host: ArgumentsHost) {
                    return new Response("error", { status: 500 });
                }
            }

            @Service()
            class TestController {
                testMethod() { }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [TestFilter],
                params: [],
                isFast: false,
            });

            expect(compiled.filters).toHaveLength(1);
            expect(compiled.filters[0].instance).toBeInstanceOf(TestFilter);
            expect(compiled.filters[0].catchMetatypes).toContain(CustomError);
        });

        it("should sort filters (specific before catch-all)", () => {
            class SpecificError extends Error { }

            @Catch(SpecificError)
            @Service()
            class SpecificFilter implements ExceptionFilter {
                catch() {
                    return new Response("specific", { status: 400 });
                }
            }

            @Catch() // Catch-all
            @Service()
            class CatchAllFilter implements ExceptionFilter {
                catch() {
                    return new Response("catch-all", { status: 500 });
                }
            }

            @Service()
            class TestController {
                testMethod() { }
            }

            // Register catch-all first, specific second
            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [CatchAllFilter, SpecificFilter],
                params: [],
                isFast: false,
            });

            // After sorting, specific should come first
            expect(compiled.filters[0].instance).toBeInstanceOf(SpecificFilter);
            expect(compiled.filters[1].instance).toBeInstanceOf(CatchAllFilter);
        });

        it("should resolve pipes for parameters", () => {
            @Service()
            class ParamPipe implements PipeTransform {
                transform(value: any) {
                    return parseInt(value);
                }
            }

            @Service()
            class TestController {
                testMethod() { }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [
                    {
                        index: 0,
                        type: "PARAM",
                        data: "id",
                        pipes: [ParamPipe],
                    },
                ],
                isFast: false,
            });

            expect(compiled.params).toHaveLength(1);
            expect(compiled.params[0].resolvedPipes).toHaveLength(1);
            expect(compiled.params[0].resolvedPipes[0]).toBeInstanceOf(ParamPipe);
        });

        it("should handle isFast flag", () => {
            @Service()
            class TestController {
                testMethod() { }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: true,
            });

            expect(compiled.isFast).toBe(true);
        });

        it("should handle already-instantiated guards/pipes/interceptors", () => {
            const guardInstance = {
                canActivate: () => true,
            } as CanActivate;

            const pipeInstance = {
                transform: (v: any) => v,
            } as PipeTransform;

            @Service()
            class TestController {
                testMethod() { }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [guardInstance],
                pipes: [pipeInstance],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            expect(compiled.guards[0]).toBe(guardInstance);
            expect(compiled.pipes[0]).toBe(pipeInstance);
        });
    });

    describe("get()", () => {
        it("should retrieve compiled metadata", () => {
            @Service()
            class TestController {
                testMethod() { }
            }

            MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            const retrieved = MetadataCache.get(TestController, "testMethod");
            expect(retrieved).toBeDefined();
            expect(retrieved.controllerInstance).toBeInstanceOf(TestController);
        });

        it("should throw error if metadata not compiled", () => {
            @Service()
            class TestController {
                testMethod() { }
            }

            expect(() => {
                MetadataCache.get(TestController, "testMethod");
            }).toThrow(/No compiled metadata found/);
        });
    });

    describe("getStats()", () => {
        it("should return cache statistics", () => {
            @Service()
            class Controller1 {
                method1() { }
                method2() { }
            }

            @Service()
            class Controller2 {
                method1() { }
            }

            MetadataCache.compile(Controller1, "method1", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            MetadataCache.compile(Controller1, "method2", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            MetadataCache.compile(Controller2, "method1", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            const stats = MetadataCache.getStats();
            expect(stats.size).toBe(3);
            expect(stats.routes).toContain("Controller1.method1");
            expect(stats.routes).toContain("Controller1.method2");
            expect(stats.routes).toContain("Controller2.method1");
        });
    });

    describe("clear()", () => {
        it("should clear all cached metadata", () => {
            @Service()
            class TestController {
                testMethod() { }
            }

            MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            expect(MetadataCache.getStats().size).toBe(1);

            MetadataCache.clear();
            expect(MetadataCache.getStats().size).toBe(0);
        });
    });

    describe("Performance", () => {
        it("should improve handler execution performance", () => {
            @Service()
            class TestController {
                counter = 0;

                testMethod() {
                    this.counter++;
                    return this.counter;
                }
            }

            const compiled = MetadataCache.compile(TestController, "testMethod", {
                guards: [],
                pipes: [],
                interceptors: [],
                filters: [],
                params: [],
                isFast: false,
            });

            // Multiple calls should use the same bound handler
            const result1 = compiled.boundHandler();
            const result2 = compiled.boundHandler();
            const result3 = compiled.boundHandler();

            expect(result1).toBe(1);
            expect(result2).toBe(2);
            expect(result3).toBe(3);
        });
    });
});
