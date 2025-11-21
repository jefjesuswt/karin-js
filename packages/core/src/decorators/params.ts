import "reflect-metadata";
import { PARAMS_METADATA } from "./constants";

export type ParamType = 'BODY' | 'QUERY' | 'PARAM' | 'HEADERS' | 'REQ' | 'RES';

export interface RouteParamMetadata {
  index: number;
  type: ParamType;
  data?: string;
}

const createParamDecorator = (type: ParamType) => {
  return (data?: string): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {

      if (!propertyKey) return;

      const existingParameters: RouteParamMetadata[] = Reflect.getMetadata(
        PARAMS_METADATA,
        target,
        propertyKey
      ) || [];

      existingParameters.push({
        index: parameterIndex,
        type,
        data,
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

export const Body = createParamDecorator('BODY');
export const Query = createParamDecorator('QUERY');
export const Param = createParamDecorator('PARAM');
export const Headers = createParamDecorator('HEADERS');
export const Req = createParamDecorator('REQ');
export const Res = createParamDecorator('RES');
