import "reflect-metadata";
import { describe, it, expect, beforeEach } from "bun:test";
import { OpenApiBuilder } from "../src/openapi.builder";
import { Controller, Get, Post, Body, Param } from "@karin-js/core";
import { z } from "zod";
import { ZodValidationPipe } from "@karin-js/core";

// Define a test controller
@Controller("users")
class UsersController {
    @Get("list")
    getUsers() { }

    @Post("create")
    createUser(@Body(new ZodValidationPipe(z.object({ name: z.string() }))) body: any) { }

    @Get(":id")
    getUser(@Param("id") id: string) { }
}

describe("OpenApiBuilder", () => {
    let appMock: any;

    beforeEach(() => {
        appMock = {
            getControllers: () => [UsersController],
        };
    });

    it("should generate openapi document with paths", () => {
        const builder = new OpenApiBuilder(appMock);
        const doc = builder.build();

        expect(doc.openapi).toBe("3.0.0");
        expect(doc.info.title).toBe("Karin-JS API");

        // Check paths
        const listPath = doc.paths["/users/list"];
        expect(listPath).toBeDefined();
        expect(listPath?.get).toBeDefined();
        expect(listPath?.get?.tags).toContain("Users");

        const createPath = doc.paths["/users/create"];
        expect(createPath).toBeDefined();
        expect(createPath?.post).toBeDefined();

        // Check request body schema
        const requestBody = createPath?.post?.requestBody as any;
        expect(requestBody).toBeDefined();
        expect(requestBody.content["application/json"].schema).toBeDefined();
    });

    it("should handle route parameters conversion", () => {
        const builder = new OpenApiBuilder(appMock);
        const doc = builder.build();

        // :id should be converted to {id}
        expect(doc.paths).toHaveProperty("/users/{id}");
        expect(doc.paths["/users/{id}"].get).toBeDefined();
    });
});
