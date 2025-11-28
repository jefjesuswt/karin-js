import { inject, singleton } from "@karin-js/core";
import "reflect-metadata";

export const SCHEMAS_REGISTRY = new Set<Function>();
export const SCHEMA_METADATA = Symbol("karin:mongoose:schema");
export const PROP_METADATA = Symbol("karin:mongoose:props");

export interface PropOptions {
  type?: any;
  required?: boolean;
  unique?: boolean;
  default?: any;
  index?: boolean;
  [key: string]: any;
}

export function Prop(options: PropOptions = {}): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const reflectedType = Reflect.getMetadata(
      "design:type",
      target,
      propertyKey
    );

    if (!options.type && reflectedType) {
      options.type = reflectedType;
    }

    const existingProps = Reflect.getMetadata(PROP_METADATA, target) || {};
    existingProps[propertyKey] = options;
    Reflect.defineMetadata(PROP_METADATA, existingProps, target);
  };
}

export function Schema(name?: string) {
  return <T extends { new (...args: any[]): any }>(target: T) => {
    SCHEMAS_REGISTRY.add(target);

    Reflect.defineMetadata(SCHEMA_METADATA, { name }, target);

    singleton()(target);

    return target;
  };
}

export function InjectModel(modelName: string) {
  return inject(`MONGO_MODEL_${modelName.toUpperCase()}`);
}

export function InjectConnection() {
  return inject("MONGO_CONNECTION");
}
