import type {
  PipeTransform,
  CanActivate,
  IHttpAdapter,
  KarinPlugin,
  ExceptionFilter,
} from "./interfaces";
import { Logger } from "./logger";
import { DICache } from "./router/di-cache";
import { MetadataCache } from "./router/metadata-cache";

export class KarinApplication {
  private logger = new Logger("KarinApplication");
  private globalPipes: PipeTransform[] = [];
  private globalGuards: CanActivate[] = [];
  private plugins: KarinPlugin[] = [];
  private globalFilters: ExceptionFilter[] = [];
  private controllers: Function[] = [];

  private server?: any;
  private isShuttingDown = false;
  private activeRequests = new Set<Promise<any>>();
  private shutdownHooksRegistered = false;
  private trackingEnabled = false; // ✅ NUEVO: Flag para deshabilitar tracking

  constructor(private readonly adapter: IHttpAdapter, private root: string) {
    try {
      this.root = root ?? process.cwd();
    } catch {
      this.root = "/";
    }

    // ✅ OPTIMIZACIÓN: Solo habilita tracking si hay hooks de shutdown
    if (typeof process !== "undefined" && typeof process.on === "function") {
      this.trackingEnabled = true;
    }
  }

  public registerController(controller: Function) {
    this.controllers.push(controller);
  }

  public getControllers() {
    return this.controllers;
  }

  getRootPath() {
    return this.root!;
  }

  public useGlobalPipes(...pipes: PipeTransform[]) {
    this.globalPipes.push(...pipes);
  }

  public useGlobalGuards(...guards: CanActivate[]) {
    this.globalGuards.push(...guards);
  }

  public useGlobalFilters(...filters: ExceptionFilter[]) {
    this.globalFilters.push(...filters);
  }

  public getGlobalFilters() {
    return this.globalFilters;
  }

  public enableCors(options?: any) {
    if (this.adapter.enableCors) {
      this.adapter.enableCors(options);
    } else {
      this.logger.warn("The current adapter does not support enableCors");
    }
  }

  public use(plugin: KarinPlugin) {
    this.plugins.push(plugin);
    if (plugin.install) {
      plugin.install(this);
    }
    this.logger.log(`Plugin registered: ${plugin.name}`);
  }

  public getHttpAdapter(): IHttpAdapter {
    return this.adapter;
  }

  public async init() {
    if (this.plugins.length > 0) {
      this.logger.log("Initializing plugins...");
    }

    for (const plugin of this.plugins) {
      if (plugin.onPluginInit) {
        await plugin.onPluginInit();
        this.logger.log(`${plugin.name} initialized`);
      }
    }

    // ✅ NUEVO: Log de estadísticas de optimización
    if (process.env.DEBUG) {
      const diStats = DICache.getStats();
      const metaStats = MetadataCache.getStats();
      this.logger.debug(`DI Cache: ${diStats.size} instances cached`);
      this.logger.debug(`Metadata Cache: ${metaStats.size} routes compiled`);
    }
  }

  public listen(port: number, ...args: any[]): void {
    let host: string | undefined = undefined;
    let callback: (() => void) | undefined = undefined;
    if (args.length === 1) {
      if (typeof args[0] === "string") host = args[0];
      else if (typeof args[0] === "function") callback = args[0];
    } else if (args.length === 2) {
      host = args[0];
      callback = args[1];
    }

    this.init()
      .then(() => {
        this.server = this.adapter.listen(port, host);
        this.registerShutdownHooks();

        if (callback) {
          callback();
        } else {
          const displayHost = host ?? "localhost";
          this.logger.log(
            `🦊 Karin-JS Server running on http://${displayHost}:${port}`
          );
        }
      })
      .catch((error) => {
        this.logger.error(`Failed to start application: ${error.message}`);
        if (typeof process !== "undefined" && process.exit) process.exit(1);
      });
  }
  public getGlobalPipes() {
    return this.globalPipes;
  }
  public getGlobalGuards() {
    return this.globalGuards;
  }
  /**
   * ✅ OPTIMIZADO: Solo trackea si es necesario
   */
  public async trackRequest<T>(promise: Promise<T>): Promise<T> {
    if (!this.trackingEnabled || !this.isShuttingDown) {
      return promise; // ✅ Fast path sin overhead
    }

    this.activeRequests.add(promise);
    return promise.finally(() => {
      this.activeRequests.delete(promise);
    });
  }
  private registerShutdownHooks() {
    if (this.shutdownHooksRegistered) return;
    if (
      typeof process === "undefined" ||
      typeof process.on !== "function" ||
      typeof process.once !== "function"
    ) {
      return;
    }

    this.shutdownHooksRegistered = true;

    const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];

    signals.forEach((signal) => {
      process.once(signal, () => {
        this.logger.warn(`Received ${signal}, starting graceful shutdown...`);
        this.shutdown(signal);
      });
    });

    process.on("uncaughtException", (error) => {
      this.logger.error("Uncaught Exception", error.stack);
      this.shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      this.logger.error("Unhandled Rejection", String(reason));
      this.shutdown("unhandledRejection");
    });
  }
  private async shutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.logger.log(`Shutting down due to: ${signal}`);

    if (this.server && typeof this.server.stop === "function") {
      this.server.stop();
      this.logger.log("HTTP Server stopped accepting connections");
    }

    if (this.activeRequests.size > 0) {
      this.logger.log(
        `Waiting for ${this.activeRequests.size} active requests to complete...`
      );

      const timeoutMs = 10000;
      const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
      const allRequests = Promise.all(Array.from(this.activeRequests));

      await Promise.race([allRequests, timeout]);

      if (this.activeRequests.size > 0) {
        this.logger.warn(
          `Force closing ${this.activeRequests.size} requests after ${timeoutMs}ms timeout`
        );
      }
    }

    this.logger.log("Cleaning up plugins...");
    for (const plugin of this.plugins) {
      if (plugin.onPluginDestroy) {
        try {
          await plugin.onPluginDestroy();
          this.logger.log(`${plugin.name} destroyed`);
        } catch (error: any) {
          this.logger.error(
            `Failed to destroy plugin ${plugin.name}`,
            error instanceof Error ? error.stack : undefined
          );
        }
      }
    }
    DICache.clear();
    MetadataCache.clear();

    this.logger.log("Shutdown complete. Goodbye! 👋");
    if (typeof process !== "undefined" && process.exit) process.exit(0);
  }
}