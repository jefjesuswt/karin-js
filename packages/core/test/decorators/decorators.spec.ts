import "reflect-metadata";
import { describe, it, expect } from "bun:test";
import { Controller } from "../../src/decorators/controller";
import { Get, Post } from "../../src/decorators/http";
import {
  CONTROLLER_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
} from "../../src/decorators/constants";
import { UseInterceptors } from "../../src/decorators/interceptor";

describe("Decorators", () => {
  it("@Controller should define controller metadata", () => {
    @Controller("/api")
    class TestController {}

    const prefix = Reflect.getMetadata(CONTROLLER_METADATA, TestController);
    expect(prefix).toBe("/api");
  });

  it("@Get should define method and path metadata", () => {
    class TestController {
      @Get("/users")
      getData() {}
    }

    const method = new TestController().getData;
    const path = Reflect.getMetadata(PATH_METADATA, method);
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);

    expect(path).toBe("/users");
    expect(httpMethod).toBe("GET");
  });

  it("@UseInterceptors should define interceptors metadata", () => {
    class TestInterceptor {}

    class TestController {
      @UseInterceptors(TestInterceptor)
      method() {}
    }

    const method = new TestController().method;
    const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, method);

    expect(interceptors).toBeArray();
    expect(interceptors).toHaveLength(1);
    expect(interceptors[0]).toBe(TestInterceptor);
  });
});
