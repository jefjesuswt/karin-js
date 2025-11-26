import "reflect-metadata";
import { Glob } from "bun";
import { join, dirname, sep } from "path"; // Agregamos sep
import { existsSync } from "fs";
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
    options: { scan?: string; cwd?: string } = {}
  ): Promise<KarinApplication> {
    const app = new KarinApplication(adapter);
    const explorer = new RouterExplorer(adapter);

    const scanPath = options.scan || "./src/**/*.controller.ts";

    // Calculamos el root de forma inteligente
    const cwd = options.cwd || this.findProjectRoot();

    // Creamos el Glob relativo al cwd calculado
    const glob = new Glob(scanPath);

    this.logger.info(`Project Root: ${cwd}`);
    this.logger.info(`Scanning controllers in: ${scanPath}`);

    for await (const file of glob.scan(cwd)) {
      const absolutePath = join(cwd, file);
      const module = await import(absolutePath);

      for (const key of Object.keys(module)) {
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

  private static findProjectRoot(): string {
    const entryFile = Bun.main;
    let currentDir = dirname(entryFile);

    // 1. Heurística de "Carpeta src":
    // Si el entry point está en 'src', el proyecto es el padre.
    // Esto soluciona sub-proyectos sin package.json (como el playground).
    if (currentDir.endsWith(`${sep}src`)) {
      return dirname(currentDir);
    }

    // 2. Búsqueda estándar de package.json
    const startDir = currentDir;
    while (currentDir !== "/" && currentDir !== ".") {
      if (existsSync(join(currentDir, "package.json"))) {
        return currentDir;
      }
      currentDir = dirname(currentDir);

      // Evitar bucles infinitos o subir demasiado en sistemas raros
      if (currentDir === dirname(currentDir)) break;
    }

    // 3. Fallback: Si fallamos, volvemos al directorio del entry file
    // (Mejor que process.cwd() que depende de dónde tiraste el comando)
    return dirname(entryFile);
  }
}
