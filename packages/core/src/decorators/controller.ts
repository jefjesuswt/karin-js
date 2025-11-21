import "reflect-metadata";
import { injectable } from "tsyringe";
import { CONTROLLER_METADATA } from "./constants";


export function Controller(prefix: string = ''): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(CONTROLLER_METADATA, prefix, target);

    injectable()(target);
  };
}
