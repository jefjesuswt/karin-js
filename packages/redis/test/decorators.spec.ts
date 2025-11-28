import { describe, it, expect } from "bun:test";
import { InjectRedis, REDIS_CLIENT_TOKEN } from "../src/decorators";
import { container, injectable } from "@karin-js/core";

describe("Redis Decorators", () => {
    it("should provide the correct token", () => {
        expect(REDIS_CLIENT_TOKEN).toBe("KARIN_REDIS_CLIENT");
    });

    it("should inject the redis client", () => {
        @injectable()
        class TestService {
            constructor(@InjectRedis() public redis: any) { }
        }

        const mockRedis = { foo: "bar" };
        container.registerInstance(REDIS_CLIENT_TOKEN, mockRedis);

        const service = container.resolve(TestService);
        expect(service.redis).toBe(mockRedis);
    });
});
