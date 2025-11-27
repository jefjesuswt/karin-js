import { Service } from "@karin-js/core";

@Service()
export class ConfigService<T = any> {
  constructor(private readonly internalConfig: T) {}

  get<K extends keyof T>(key: K): T[K] {
    return this.internalConfig[key];
  }

  getAll(): T {
    return this.internalConfig;
  }
}
