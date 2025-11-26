import "reflect-metadata";
import { describe, it, expect, mock } from "bun:test";
import { ParamsResolver } from "../../src/router/param-resolver";
import type { IHttpAdapter, RouteParamMetadata } from "../..";

describe("ParamsResolver", () => {
  const resolver = new ParamsResolver();

  const mockAdapter = {
    readBody: mock(async () => ({ name: "Karin" })),
    getQuery: mock(() => ({ page: "1" })),
    getParams: mock(() => ({ id: "123" })),
    getHeaders: mock(() => ({ "user-agent": "Bun" })),
    getRequest: mock(() => ({})),
    getResponse: mock(() => ({})),
  } as unknown as IHttpAdapter;

  const ctx = {};

  it("should resolve @Body correctly", async () => {
    const metadata: RouteParamMetadata[] = [
      { index: 0, type: "BODY", data: undefined },
    ];

    const args = await resolver.resolve(ctx, metadata, [], mockAdapter);

    expect(args[0]).toEqual({ name: "Karin" });
    expect(mockAdapter.readBody).toHaveBeenCalled();
  });

  it("should resolve @Query('page') correctly", async () => {
    const metadata: RouteParamMetadata[] = [
      { index: 0, type: "QUERY", data: "page" },
    ];

    const args = await resolver.resolve(ctx, metadata, [], mockAdapter);

    expect(args[0]).toBe("1");
    expect(mockAdapter.getQuery).toHaveBeenCalled();
  });

  it("should resolve multiple parameters in the correct order", async () => {
    const metadata: RouteParamMetadata[] = [
      { index: 1, type: "BODY" },
      { index: 0, type: "PARAM", data: "id" },
    ];

    const args = await resolver.resolve(ctx, metadata, [], mockAdapter);

    expect(args[0]).toBe("123");
    expect(args[1]).toEqual({ name: "Karin" });
  });
});
