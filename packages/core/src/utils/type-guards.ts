import type { ExceptionFilter, KarinInterceptor } from "../interfaces";

export function isObject(
  value: unknown
): value is Record<string | symbol, unknown> {
  return typeof value === "object" && value !== null;
}

export function isConstructor(
  value: unknown
): value is new (...args: unknown[]) => unknown {
  return typeof value === "function";
}

export function isFilter(value: unknown): value is Object {
  return value !== null && typeof value === "object";
}

export function isExceptionFilter(value: unknown): value is ExceptionFilter {
  return isObject(value) && typeof (value as any).catch === "function";
}

export function isInterceptor(value: unknown): value is KarinInterceptor {
  return isObject(value) && typeof (value as any).intercept === "function";
}
