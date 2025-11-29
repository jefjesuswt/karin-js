import "reflect-metadata";
import { PARAMS_METADATA } from "./constants";
import type { PipeTransform, Type, ExecutionContext } from "../interfaces";

export type ParamType =
  | "BODY"
  | "QUERY"
  | "PARAM"
  | "HEADERS"
  | "REQ"
  | "RES"
  | "CUSTOM"; // <--- Importante

export interface RouteParamMetadata {
  index: number;
  type: ParamType;
  data?: any;
  pipes?: (PipeTransform | Type<PipeTransform>)[];
  // 👇 Tipado estricto: La factory recibe data y el Contexto
  factory?: (data: any, context: ExecutionContext) => any;
}

export function createParamDecorator<T = any>(
  factory: (data: T, ctx: ExecutionContext) => any
) {
  return (
    data?: T,
    ...pipes: (PipeTransform | Type<PipeTransform>)[]
  ): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      if (!propertyKey) return;

      const existingParameters: RouteParamMetadata[] =
        Reflect.getMetadata(PARAMS_METADATA, target, propertyKey) || [];

      existingParameters.push({
        index: parameterIndex,
        type: "CUSTOM", // Marcamos como custom
        data,
        pipes,
        factory, // Guardamos la lógica del usuario
      });

      Reflect.defineMetadata(
        PARAMS_METADATA,
        existingParameters,
        target,
        propertyKey
      );
    };
  };
}

// ... (El resto de createNativeParamDecorator y los exports Body, Query, etc. se quedan igual)
const createNativeParamDecorator = (type: ParamType) => {
  return (
    dataOrPipe?: string | PipeTransform | Type<PipeTransform>,
    ...pipes: (PipeTransform | Type<PipeTransform>)[]
  ): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      if (!propertyKey) return;
      const existingParameters: RouteParamMetadata[] =
        Reflect.getMetadata(PARAMS_METADATA, target, propertyKey) || [];

      let data: string | undefined;
      const allPipes = [...pipes];

      if (typeof dataOrPipe === "string") {
        data = dataOrPipe;
      } else if (dataOrPipe) {
        allPipes.unshift(dataOrPipe as any);
      }

      existingParameters.push({
        index: parameterIndex,
        type,
        data,
        pipes: allPipes,
      });

      Reflect.defineMetadata(
        PARAMS_METADATA,
        existingParameters,
        target,
        propertyKey
      );
    };
  };
};

export const Body = createNativeParamDecorator("BODY");
export const Query = createNativeParamDecorator("QUERY");
export const Param = createNativeParamDecorator("PARAM");
export const Headers = createNativeParamDecorator("HEADERS");
export const Req = createNativeParamDecorator("REQ");
export const Res = createNativeParamDecorator("RES");

export const Ctx = createParamDecorator((data, ctx) => ctx);
