import type {
  PipeTransform,
  CanActivate,
  IHttpAdapter,
  KarinPlugin,
} from "./interfaces";
import { Logger } from "./logger";

export class KarinApplication {
  private logger = new Logger("KarinApplication");
  private globalPipes: PipeTransform[] = [];
  private globalGuards: CanActivate[] = [];
  private plugins: KarinPlugin[] = [];

  constructor(private readonly adapter: IHttpAdapter) {}

  public useGlobalPipes(...pipes: PipeTransform[]) {
    this.globalPipes.push(...pipes);
  }

  public useGlobalGuards(...guards: CanActivate[]) {
    this.globalGuards.push(...guards);
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
    plugin.install(this);
    this.logger.log(`Plugin registered: ${plugin.name}`);
  }

  public async init() {
    if (this.plugins.length > 0) {
      this.logger.log("Initializing plugins...");
    }

    for (const plugin of this.plugins) {
      if (plugin.onModuleInit) {
        await plugin.onModuleInit();
        this.logger.log(`${plugin.name} initialized`);
      }
    }
  }

  public listen(port: number): void;
  public listen(port: number, callback: () => void): void;
  public listen(port: number, host: string): void;
  public listen(port: number, host: string, callback: () => void): void;

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
        this.adapter.listen(port, host);

        if (callback) {
          callback();
        } else {
          const displayHost = host ?? "localhost";
          const protocol = "http";
          this.logger.log(
            `Application is running on ${protocol}://${displayHost}:${port}`
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
}
