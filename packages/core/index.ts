import "reflect-metadata";

export * from "./src/decorators";

export { KarinFactory } from "./src/karin.factory";
export { KarinApplication } from "./src/karin.application";

export * from "./src/interfaces";
export { KarinExecutionContext } from "./src/context/execution-context";

export * from "./src/exceptions/http.exception";

export * from "./src/pipes/zod-validation.pipe";
export * from "./src/logger";

export {
  MetadataScanner,
  type RouteDefinition,
} from "./src/router/metadata-scanner";

export { DICache } from "./src/router/di-cache";
export { MetadataCache, type CompiledRouteMetadata } from "./src/router/metadata-cache";

export { injectable, inject, singleton, container, delay } from "tsyringe";

export const VERSION = "0.6.0";