import "reflect-metadata";
import { FAST_ROUTE_METADATA } from "./constants";

export function Fast(): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    Reflect.defineMetadata(FAST_ROUTE_METADATA, true, descriptor.value);
    return descriptor;
  };
}
