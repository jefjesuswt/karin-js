import "reflect-metadata";
import { Glob } from "bun";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { CONTROLLER_METADATA } from "./decorators/constants";
import { Logger } from "./logger";
import { isConstructor } from "./utils/type-guards";
import { KarinApplication } from "./karin.application";
import type { IHttpAdapter } from "./interfaces";
import { RouterExplorer } from "./router/router-explorer";

export interface KarinFactoryOptions {
  scan?: string;
  cwd?: string;
  controllers?: any[];
  strict?: boolean;
}

export class KarinFactory {
  private static logger = new Logger("KarinFactory");

  static async create(
    adapter: IHttpAdapter,
    options: KarinFactoryOptions = {}
  ): Promise<KarinApplication> {
    // 1. DETECCIÓN AUTOMÁTICA DE RAÍZ (La magia)
    const root = options.cwd ?? KarinFactory.findProjectRoot();

    const app = new KarinApplication(adapter, root);
    const explorer = new RouterExplorer(adapter);

    // ... Carga manual de controllers (código existente) ...
    if (options.controllers && options.controllers.length > 0) {
      this.logger.info(
        `Registering ${options.controllers.length} manual controllers`
      );
      for (const ControllerClass of options.controllers) {
        if (isConstructor(ControllerClass)) {
          explorer.explore(app, ControllerClass);
        }
      }
    }

    // 2. ESCANEO INTELIGENTE RELATIVO AL ROOT
    const shouldScan = options.scan || !options.controllers;

    if (shouldScan) {
      // Por defecto buscamos en src/ dentro del root detectado
      const scanPath =
        typeof options.scan === "string"
          ? options.scan
          : join("src", "**", "*.controller.ts");

      // Glob escanea relativo al root
      const glob = new Glob(scanPath);
      this.logger.info(`Scanning files in: ${scanPath}...`);

      for await (const file of glob.scan(root)) {
        const absolutePath = join(root, file);
        try {
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
        } catch (error: any) {
          this.logger.error(`Error loading ${file}: ${error.message}`);
          if (options.strict) throw error;
        }
      }
    }

    return app;
  }

  /**
   * Encuentra la carpeta del proyecto (donde está el package.json)
   * basándose en el archivo principal que se está ejecutando (main.ts).
   */
  private static findProjectRoot(): string {
    // Si estamos en Bun, usamos el punto de entrada real
    if (typeof Bun !== "undefined" && Bun.main) {
      let currentDir = dirname(Bun.main);

      // Subimos niveles hasta encontrar package.json
      while (currentDir !== "/" && currentDir !== ".") {
        if (existsSync(join(currentDir, "package.json"))) {
          return currentDir;
        }
        const parent = dirname(currentDir);
        if (parent === currentDir) break;
        currentDir = parent;
      }
      return dirname(Bun.main); // Fallback al dir del script
    }
    return process.cwd(); // Fallback para Node o casos raros
  }
}
