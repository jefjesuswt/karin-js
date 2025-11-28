import "reflect-metadata";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { CONTROLLER_METADATA } from "./decorators/constants";
import { Logger } from "./logger";
import { isConstructor } from "./utils/type-guards";
import { KarinApplication } from "./karin.application";
import type { IHttpAdapter } from "./interfaces";
import { RouterExplorer } from "./router/router-explorer";

export interface KarinFactoryOptions {
  scan?: boolean | string;
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
    // 1. Detección de raíz (Solo si vamos a escanear)
    // En serverless 'cwd' puede fallar o no tener sentido, así que somos defensivos
    const root =
      options.cwd ?? (options.scan ? KarinFactory.findProjectRoot() : "/");

    const app = new KarinApplication(adapter, root);
    const explorer = new RouterExplorer(adapter);

    // 2. Carga Manual (ESTRATEGIA SERVERLESS / MANUAL)
    // Esta es la ruta crítica para Cloudflare Workers
    if (options.controllers && options.controllers.length > 0) {
      this.logger.info(
        `Registering ${options.controllers.length} manual controllers`
      );
      for (const ControllerClass of options.controllers) {
        if (isConstructor(ControllerClass)) {
          explorer.explore(app, ControllerClass);
        }
      }

      // 🚀 OPTIMIZACIÓN: Si hay controladores manuales y no se fuerza scan,
      // retornamos inmediatamente. Esto evita cargar 'bun' o 'fs', permitiendo Tree-Shaking.
      if (!options.scan) {
        return app;
      }
    }

    // 3. Escaneo Automático (ESTRATEGIA SERVIDOR TRADICIONAL)
    // Por defecto es true, salvo que se haya desactivado explícitamente
    if (options.scan !== false) {
      await this.scanControllers(
        root,
        options.scan,
        explorer,
        app,
        options.strict
      );
    }

    return app;
  }

  private static async scanControllers(
    root: string,
    scanOption: boolean | string | undefined,
    explorer: RouterExplorer,
    app: KarinApplication,
    strict?: boolean
  ) {
    const scanPath =
      typeof scanOption === "string"
        ? scanOption
        : join("src", "**", "*.controller.ts");

    this.logger.info(`Scanning files in: ${scanPath}...`);

    try {
      // ⚠️ DYNAMIC IMPORT: Vital para compatibilidad
      // Solo cargamos 'bun' si el runtime lo soporta.
      if (typeof Bun !== "undefined") {
        const { Glob } = await import("bun");
        const globScanner = new Glob(scanPath);

        for await (const file of globScanner.scan(root)) {
          const absolutePath = join(root, file);
          await this.loadModule(absolutePath, explorer, app, strict);
        }
      } else {
        // Fallback futuro para Node.js (glob de npm)
        this.logger.warn(
          "Auto-scan is currently optimized for Bun runtime. Skipping scan."
        );
      }
    } catch (e: any) {
      // En entornos restringidos (Edge), esto captura el error y permite seguir
      this.logger.warn(
        `File scanning skipped/failed (likely Serverless environment): ${e.message}`
      );
    }
  }

  private static async loadModule(
    path: string,
    explorer: RouterExplorer,
    app: KarinApplication,
    strict?: boolean
  ) {
    try {
      const module = await import(path);
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
      this.logger.error(`Error loading ${path}: ${error.message}`);
      if (strict) throw error;
    }
  }

  private static findProjectRoot(): string {
    try {
      if (typeof Bun !== "undefined" && Bun.main) {
        let currentDir = dirname(Bun.main);
        while (currentDir !== "/" && currentDir !== ".") {
          if (existsSync(join(currentDir, "package.json"))) {
            return currentDir;
          }
          const parent = dirname(currentDir);
          if (parent === currentDir) break;
          currentDir = parent;
        }
        return dirname(Bun.main);
      }
      return process.cwd();
    } catch {
      return "/"; // Fallback seguro para entornos sin acceso a process/fs
    }
  }
}
