import type { PipeTransform, CanActivate, IHttpAdapter } from "./interfaces";
import { Logger } from "./logger";

export class KarinApplication {
  private logger = new Logger("KarinApplication");
  private globalPipes: PipeTransform[] = [];
  private globalGuards: CanActivate[] = [];

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
  }

  public getGlobalPipes() {
    return this.globalPipes;
  }
  public getGlobalGuards() {
    return this.globalGuards;
  }
}
