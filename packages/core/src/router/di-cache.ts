import { container, type InjectionToken } from "tsyringe";
import { Logger } from "../logger";

export class DICache {
  private static instances = new Map<any, any>();
  private static logger = new Logger("DICache");

  static resolve<T>(token: InjectionToken<T> | any): T {
    // ✅ Si es una instancia (objeto), retornarla directamente
    if (
      typeof token !== "function" &&
      typeof token !== "string" &&
      typeof token !== "symbol"
    ) {
      return token;
    }

    if (!this.instances.has(token)) {
      const instance = container.resolve(token);
      this.instances.set(token, instance);

      if (process.env.DEBUG) {
        const tokenName =
          typeof token === "function" ? token.name : String(token);
        this.logger.debug(`Cached DI instance: ${tokenName}`);
      }
    }
    return this.instances.get(token)!;
  }

  static warmup(tokens: any[]) {
    this.logger.log(`Warming up ${tokens.length} DI instances...`);

    const start = performance.now();
    tokens.forEach((token) => this.resolve(token));
    const duration = (performance.now() - start).toFixed(2);

    this.logger.log(`DI warmup completed in ${duration}ms`);
  }

  static clear() {
    this.instances.clear();
    this.logger.debug("DI Cache cleared");
  }

  static getStats() {
    return {
      size: this.instances.size,
      keys: Array.from(this.instances.keys()).map((k) => k?.name || String(k)),
    };
  }
}
