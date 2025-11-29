import { Service, inject } from "@karin-js/core";

@Service()
export class ConfigService<T = any> {
  constructor(@inject("CONFIG_DATA") private readonly internalConfig: T) { }

  get<K extends keyof T>(key: K): NonNullable<T[K]>;
  get<R = any>(key: string): R;
  get(key: any): any {
    const value = (this.internalConfig as any)[key];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing required configuration key: "${String(key)}"`);
    }
    return value;
  }

  getAll(): T {
    return this.internalConfig;
  }
}
