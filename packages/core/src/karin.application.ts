import type {
  PipeTransform,
  CanActivate,
  IHttpAdapter,
  KarinPlugin,
  ExceptionFilter,
} from "./interfaces";
import { Logger } from "./logger";

export class KarinApplication {
  private logger = new Logger("KarinApplication");
  private globalPipes: PipeTransform[] = [];
  private globalGuards: CanActivate[] = [];
  private plugins: KarinPlugin[] = [];
  private globalFilters: ExceptionFilter[] = [];

  // 👇 Estado para Graceful Shutdown
  private server?: any; // Referencia al servidor nativo (Bun server)
  private isShuttingDown = false;
  private activeRequests = new Set<Promise<any>>();
  private shutdownHooksRegistered = false;

  constructor(private readonly adapter: IHttpAdapter, private root: string) {
    this.root = root ?? process.cwd();
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
        // 👇 Guardamos la referencia del servidor
        // Asegúrate de que tus adaptadores (H3/Hono) retornen el resultado de Bun.serve()
        this.server = this.adapter.listen(port, host);

        // 👇 Activamos los hooks de apagado
        this.registerShutdownHooks();

        if (callback) {
          callback();
        } else {
          const displayHost = host ?? "localhost";
          this.logger.log(
            `Application is running on http://${displayHost}:${port}`
          );
        }
      })
      .catch((error) => {
        this.logger.error(`Failed to start application: ${error.message}`);
        process.exit(1);
      });
  }

  public getGlobalPipes() {
    return this.globalPipes;
  }
  public getGlobalGuards() {
    return this.globalGuards;
  }

  // --- GRACEFUL SHUTDOWN LOGIC ---

  /**
   * Método usado internamente por el Router para rastrear peticiones en vuelo.
   */
  public trackRequest<T>(promise: Promise<T>): Promise<T> {
    this.activeRequests.add(promise);
    return promise.finally(() => {
      this.activeRequests.delete(promise);
    });
  }

  private registerShutdownHooks() {
    if (this.shutdownHooksRegistered) return;
    this.shutdownHooksRegistered = true;

    const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];

    signals.forEach((signal) => {
      // Usamos .once en lugar de .on para ser más limpios
      process.once(signal, () => {
        this.logger.warn(`Received ${signal}, starting graceful shutdown...`);
        this.shutdown(signal);
      });
    });

    signals.forEach((signal) => {
      process.on(signal, () => {
        this.logger.warn(`Received ${signal}, starting graceful shutdown...`);
        this.shutdown(signal);
      });
    });

    // Capturar errores no manejados para cerrar limpiamente también
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

    // 1. Dejar de aceptar nuevas conexiones
    if (this.server && typeof this.server.stop === "function") {
      this.server.stop(); // Bun server stop (cierra el socket pero mantiene activas las reqs)
      this.logger.log("HTTP Server stopped accepting connections");
    }

    // 2. Esperar a que las peticiones activas terminen (Drenaje)
    if (this.activeRequests.size > 0) {
      this.logger.log(
        `Waiting for ${this.activeRequests.size} active requests to complete...`
      );

      const timeoutMs = 10000; // 10 segundos máximo de espera
      const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));

      const allRequests = Promise.all(Array.from(this.activeRequests));

      // Carrera: o terminan todas o se acaba el tiempo
      await Promise.race([allRequests, timeout]);

      if (this.activeRequests.size > 0) {
        this.logger.warn(
          `Force closing ${this.activeRequests.size} requests after ${timeoutMs}ms timeout`
        );
      }
    }

    // 3. Destruir Plugins (Cerrar DB, Redis, etc.)
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

    this.logger.log("Shutdown complete. Goodbye! 👋");
    process.exit(0);
  }
}
