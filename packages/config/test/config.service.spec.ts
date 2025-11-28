import { describe, it, expect } from "bun:test";
import { ConfigService } from "../src/config.service";

describe("ConfigService", () => {
    it("should retrieve a value by key", () => {
        const config = { PORT: 3000, HOST: "localhost" };
        const service = new ConfigService(config);

        expect(service.get("PORT")).toBe(3000);
        expect(service.get("HOST")).toBe("localhost");
    });

    it("should retrieve all configuration", () => {
        const config = { PORT: 3000, HOST: "localhost" };
        const service = new ConfigService(config);

        expect(service.getAll()).toEqual(config);
    });

    it("should return undefined for non-existent keys", () => {
        const config = { PORT: 3000 };
        const service = new ConfigService(config);

        expect(service.get("HOST" as any)).toBeUndefined();
    });
});
