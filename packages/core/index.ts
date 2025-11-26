import "reflect-metadata";

// 1. Core Decorators
export * from "./src/decorators";

// 2. Factory & Application
export { KarinFactory } from "./src/karin.factory";
// KarinApplication se usa internamente, pero a veces el usuario necesita el tipo
export { KarinApplication } from "./src/karin.application";

// 3. Interfaces & Context
export * from "./src/interfaces";
export { KarinExecutionContext } from "./src/context/execution-context";

// 4. Exceptions
export * from "./src/exceptions/http.exception";

// 5. Pipes Communes
export * from "./src/pipes/zod-validation.pipe";
export * from "./src/logger";

// 6. External Utilities (Re-exports útiles)
export { injectable, inject, singleton, container, delay } from "tsyringe";

export const VERSION = "0.0.6";
