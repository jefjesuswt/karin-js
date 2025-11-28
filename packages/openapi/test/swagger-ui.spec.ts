import { describe, it, expect } from "bun:test";
import { generateSwaggerHtml } from "../src/swagger-ui";

describe("Swagger UI Generator", () => {
    it("should generate HTML with default options", () => {
        const html = generateSwaggerHtml({
            title: "Test API",
            jsonUrl: "/docs/json",
        });

        expect(html).toContain("<title>Test API</title>");
        expect(html).toContain("url: '/docs/json'");
        expect(html).toContain("https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js");
    });

    it("should generate HTML with custom version", () => {
        const html = generateSwaggerHtml({
            title: "Test API",
            jsonUrl: "/docs/json",
            version: "4.0.0",
        });

        expect(html).toContain("https://unpkg.com/swagger-ui-dist@4.0.0/swagger-ui-bundle.js");
    });
});
