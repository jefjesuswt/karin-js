import "reflect-metadata";
import { Glob } from "bun";
import { join } from "path";
import { CONTROLLER_METADATA } from "./decorators/constants";
import { Logger } from "./logger";
import { isConstructor } from "./utils/type-guards";
import { KarinApplication } from "./karin.application";
import type { IHttpAdapter } from "./interfaces";
import { RouterExplorer } from "./router/router-explorer";

export class KarinFactory {
  private static logger = new Logger("KarinFactory");

  static async create(
    adapter: IHttpAdapter,
    options: { scan?: string } = {}
  ): Promise<KarinApplication> {
    const app = new KarinApplication(adapter);
    const explorer = new RouterExplorer(adapter);

    const scanPath = options.scan || "./src/**/*.controller.ts";
    const glob = new Glob(scanPath);
    const cwd = process.cwd();

    this.logger.info(`Scanning controllers in: ${scanPath}`);

    for await (const file of glob.scan(cwd)) {
      const absolutePath = join(cwd, file);
      const module = await import(absolutePath);

      for (const key in module) {
        const CandidateClass = module[key];
        if (
          isConstructor(CandidateClass) &&
          Reflect.hasMetadata(CONTROLLER_METADATA, CandidateClass)
        ) {
          explorer.explore(app, CandidateClass);
        }
      }
    }

    return app;
  }
}
