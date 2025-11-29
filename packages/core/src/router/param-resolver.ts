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
    const args: unknown[] = [];
    params.sort((a, b) => a.index - b.index);

    for (const param of params) {
      let value: unknown = undefined;
      let metaType: ArgumentMetadata["type"] = "custom";

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
          metaType = "custom";
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
          metaType = "custom";
          break;
      }

      if (param.type !== "CUSTOM" && param.data && isObject(value)) {
        value = value[param.data];
      }

      let pipesToRun = globalPipes;
      if (param.resolvedPipes.length > 0) {
        pipesToRun =
          globalPipes.length > 0
            ? [...globalPipes, ...param.resolvedPipes]
            : param.resolvedPipes;
      }

      for (const pipe of pipesToRun) {
        value = await pipe.transform(value, {
          type: metaType,
          data: typeof param.data === "string" ? param.data : undefined,
        });
      }

      args[param.index] = value;
    }

    return args;
  }
}