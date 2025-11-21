export function isObject(value: unknown): value is Record<string | symbol, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isConstructor(value: unknown): value is new (...args: unknown[]) => unknown {
  return typeof value === 'function';
}
