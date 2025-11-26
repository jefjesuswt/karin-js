import { container } from "tsyringe";
import { isConstructor, isObject } from "../utils/type-guards";
import type {
  IHttpAdapter,
  PipeTransform,
  ArgumentMetadata,
} from "../interfaces";
import type { RouteParamMetadata } from "../decorators/params";

export class ParamsResolver {
  async resolve(
    ctx: any, // Contexto nativo (H3Event | Context)
    params: RouteParamMetadata[],
    combinedPipes: PipeTransform[],
    adapter: IHttpAdapter
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
      }

      if (param.data && isObject(value)) {
        value = value[param.data];
      }

      // Ejecución de Pipes
      const paramPipes = (param.pipes || []).map((p) =>
        isConstructor(p) ? container.resolve(p) : p
      );
      const pipesToRun = [...combinedPipes, ...paramPipes];

      for (const pipe of pipesToRun) {
        const pipeInstance = isConstructor(pipe)
          ? container.resolve(pipe)
          : pipe;

        if ((pipeInstance as PipeTransform).transform) {
          value = await (pipeInstance as PipeTransform).transform(value, {
            type: metaType,
            data: param.data,
          });
        }
      }

      args[param.index] = value;
    }

    return args;
  }
}
