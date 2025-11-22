import "reflect-metadata";
import { PARAMS_METADATA } from "./constants";
import type { PipeTransform, Type } from "../interfaces";

export type ParamType = "BODY" | "QUERY" | "PARAM" | "HEADERS" | "REQ" | "RES";

export interface RouteParamMetadata {
  index: number;
  type: ParamType;
  data?: string;
  pipes?: (PipeTransform | Type<PipeTransform>)[];
}

const createParamDecorator = (type: ParamType) => {
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
      } else if (
        dataOrPipe &&
        (typeof dataOrPipe === "function" || typeof dataOrPipe === "object")
      ) {
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

export const Body = createParamDecorator("BODY");
export const Query = createParamDecorator("QUERY");
export const Param = createParamDecorator("PARAM");
export const Headers = createParamDecorator("HEADERS");
export const Req = createParamDecorator("REQ");
export const Res = createParamDecorator("RES");
