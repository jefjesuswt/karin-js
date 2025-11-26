import "reflect-metadata";
import { FILTER_CATCH_EXCEPTIONS, FILTER_METADATA } from "./constants";
import type { ExceptionFilter } from "../interfaces";

export function Catch(...exceptions: any[]): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}

export function UseFilters(
  ...filters: (ExceptionFilter | Function)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: PropertyDescriptor
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(FILTER_METADATA, filters, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(FILTER_METADATA, filters, target);
    return target;
  };
}
