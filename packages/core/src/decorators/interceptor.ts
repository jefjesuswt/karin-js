import "reflect-metadata";
import { INTERCEPTORS_METADATA } from "./constants";
import type { KarinInterceptor } from "../interfaces";

export function UseInterceptors(
  ...interceptors: (KarinInterceptor | Function)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: PropertyDescriptor
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA,
        interceptors,
        descriptor.value
      );
      return descriptor;
    }
    Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, target);
    return target;
  };
}
