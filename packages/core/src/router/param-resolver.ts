import { container } from "tsyringe";
import { isConstructor, isObject } from "../utils/type-guards";
import type {
  IHttpAdapter,
  PipeTransform,
  ArgumentMetadata,
  ExecutionContext,
} from "../interfaces";
import type { RouteParamMetadata } from "../decorators/params";

export class ParamsResolver {
  async resolve(
    ctx: any,
    params: RouteParamMetadata[],
    // 👇 CAMBIO: Ahora esperamos Pipes ya instanciados (rendimiento)
    // Aunque mantenemos compatibilidad por si acaso
    pipes: PipeTransform[],
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

      // 👇 OPTIMIZACIÓN: Pipes locales del parámetro
      // Aquí seguimos resolviendo bajo demanda porque están en metadata profunda,
      // pero podríamos optimizarlo en el futuro pre-procesando metadata.
      // Por ahora, optimizamos los pipes globales/clase/método que vienen en 'pipes'.
      const paramPipesInstances = (param.pipes || []).map((p) =>
        isConstructor(p) ? container.resolve(p) : p
      );

      const pipesToRun = [...pipes, ...paramPipesInstances];

      for (const pipe of pipesToRun) {
        // Asumimos que 'pipe' ya es instancia si viene del array principal
        const pipeInstance = isConstructor(pipe)
          ? container.resolve(pipe)
          : pipe;

        if ((pipeInstance as PipeTransform).transform) {
          value = await (pipeInstance as PipeTransform).transform(value, {
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
