import { container } from "tsyringe";
import { isConstructor, isObject } from "../utils/type-guards";
import type {
  IHttpAdapter,
  PipeTransform,
  ArgumentMetadata,
  ExecutionContext, // Importamos la interfaz
} from "../interfaces";
import type { RouteParamMetadata } from "../decorators/params";

export class ParamsResolver {
  async resolve(
    ctx: any,
    params: RouteParamMetadata[],
    combinedPipes: PipeTransform[],
    adapter: IHttpAdapter,
    executionContext: ExecutionContext // 👈 NUEVO ARGUMENTO: Recibimos el contexto ya creado
  ): Promise<unknown[]> {
    const args: unknown[] = [];

    // Ordenamos por índice para insertar en la posición correcta del array de argumentos
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

        // 👇 LA MAGIA DE LOS CUSTOM DECORATORS
        case "CUSTOM":
          if (param.factory) {
            // Ejecutamos la función del usuario pasándole la data y el contexto completo
            value = param.factory(param.data, executionContext);
          }
          metaType = "custom";
          break;
      }

      // Extracción de propiedades específicas (ej: @Body('email'))
      // Nota: Para CUSTOM, usualmente la factory ya devuelve lo que quiere,
      // pero permitimos esto por consistencia si param.data es string.
      if (param.type !== "CUSTOM" && param.data && isObject(value)) {
        value = value[param.data];
      }

      // Ejecución de Pipes (Validación/Transformación)
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
            data: typeof param.data === "string" ? param.data : undefined,
          });
        }
      }

      args[param.index] = value;
    }

    return args;
  }
}
