import { isObject } from "../utils/type-guards";
import type {
  IHttpAdapter,
  PipeTransform,
  ArgumentMetadata,
  ExecutionContext,
} from "../interfaces";
import type { ResolvedParamMetadata } from "./metadata-cache";

export class ParamsResolver {

  async resolve(
    ctx: any,
    params: ResolvedParamMetadata[],
    globalPipes: PipeTransform[],
    adapter: IHttpAdapter,
    executionContext: ExecutionContext
  ): Promise<unknown[]> {
    // ✅ OPTIMIZACIÓN: Fast path para casos sin params
    if (params.length === 0) {
      return [];
    }

    const args: unknown[] = new Array(params.length); // ✅ Pre-allocate

    for (const param of params) {
      let value: unknown = undefined;
      let metaType: ArgumentMetadata["type"] = "custom";

      // ✅ OPTIMIZACIÓN: Switch más rápido que if-else chain
      switch (param.type) {
        case "BODY":
          value = await adapter.readBody(ctx);
          metaType = "body";
          break;
        case "QUERY":
          value = adapter.getQuery(ctx);
          metaType = "query";
          break;
        case "PARAM":
          value = adapter.getParams(ctx);
          metaType = "param";
          break;
        case "HEADERS":
          value = adapter.getHeaders(ctx);
          break;
        case "REQ":
          value = adapter.getRequest(ctx);
          break;
        case "RES":
          value = adapter.getResponse(ctx);
          break;
        case "CUSTOM":
          if (param.factory) {
            value = param.factory(param.data, executionContext);
          }
          break;
      }

      if (param.type !== "CUSTOM" && param.data && isObject(value)) {
        value = value[param.data];
      }

      // ✅ OPTIMIZACIÓN: Solo run pipes si hay alguno
      const hasLocalPipes = param.resolvedPipes.length > 0;
      const hasGlobalPipes = globalPipes.length > 0;

      if (hasGlobalPipes || hasLocalPipes) {
        const pipesToRun = hasGlobalPipes && hasLocalPipes
          ? [...globalPipes, ...param.resolvedPipes]
          : hasGlobalPipes
            ? globalPipes
            : param.resolvedPipes;

        for (const pipe of pipesToRun) {
          value = await pipe.transform(value, {
            type: metaType,
            data: typeof param.data === "string" ? param.data : undefined,
          });
        }
      }

      args[param.index] = value;
    }

    return args;
  }
}