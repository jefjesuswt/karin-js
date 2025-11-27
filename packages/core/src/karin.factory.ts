import "reflect-metadata";
import { Glob } from "bun";
import { join, dirname, sep } from "path";
import { existsSync } from "fs";
import { CONTROLLER_METADATA } from "./decorators/constants";
import { Logger } from "./logger";
import { isConstructor } from "./utils/type-guards";
import { KarinApplication } from "./karin.application";
import type { IHttpAdapter } from "./interfaces";
import { RouterExplorer } from "./router/router-explorer";

export interface KarinFactoryOptions {
  /** Ruta glob para buscar controladores (ej: "./src/*.ts"). Si se omite, se usa el default. */
  scan?: string;
  /** Directorio de trabajo manual. Si se omite, se autodetecta. */
  cwd?: string;
  /** Lista de controladores para registrar manualmente (útil para tests o monorepos estrictos). */
  controllers?: any[];
  /** * Si es true, el framework lanzará una excepción y detendrá el arranque si falla al cargar un archivo.
   * Por defecto es false (solo loguea el error y continúa).
   */
  strict?: boolean;
}

export class KarinFactory {
  private static logger = new Logger("KarinFactory");

  static async create(
    adapter: IHttpAdapter,
    options: KarinFactoryOptions = {}
  ): Promise<KarinApplication> {
    // 1. INPUT VALIDATION (Seguridad)
    if (options.scan !== undefined && typeof options.scan !== "string") {
      throw new TypeError('Option "scan" must be a string');
    }
    if (
      options.controllers !== undefined &&
      !Array.isArray(options.controllers)
    ) {
      throw new TypeError('Option "controllers" must be an array');
    }

    const app = new KarinApplication(adapter);
    const explorer = new RouterExplorer(adapter);

    // 2. Carga Manual de Controladores (Prioridad Alta)
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

    // 3. Escaneo Automático
    // Escaneamos si se pidió explícitamente O si no hay controladores manuales
    const shouldScan = options.scan || !options.controllers;

    if (shouldScan) {
      const scanPath =
        typeof options.scan === "string"
          ? options.scan
          : "./src/**/*.controller.ts";

      const cwd = options.cwd || this.findProjectRoot();
      const glob = new Glob(scanPath);

      this.logger.info(`Project Root: ${cwd}`);
      this.logger.info(`Scanning controllers in: ${scanPath}`);

      for await (const file of glob.scan(cwd)) {
        const absolutePath = join(cwd, file);

        // 4. ERROR HANDLING ROBUSTO
        try {
          // Importación dinámica protegida
          const module = await import(absolutePath);

          // Iteración segura sobre las exportaciones
          for (const key of Object.keys(module)) {
            const CandidateClass = module[key];

            try {
              // Verificación de metadatos protegida
              if (
                isConstructor(CandidateClass) &&
                Reflect.hasMetadata(CONTROLLER_METADATA, CandidateClass)
              ) {
                explorer.explore(app, CandidateClass);
              }
            } catch (explorerError: any) {
              this.logger.error(
                `Failed to register controller ${key} from ${file}: ${explorerError.message}`
              );
              // Si estamos en modo estricto, detenemos el arranque
              if (options.strict) throw explorerError;
            }
          }
        } catch (importError: any) {
          this.logger.error(
            `Failed to import controller file: ${file}. Error: ${importError.message}`
          );
          // Error crítico de sintaxis o archivo corrupto
          if (options.strict) throw importError;
        }
      }
    }

    return app;
  }

  // ... (findProjectRoot se mantiene igual, ya está optimizado)
  private static findProjectRoot(): string {
    const entryFile = Bun.main;
    let currentDir = dirname(entryFile);

    // Heurística de "Carpeta src"
    if (currentDir.endsWith(`${sep}src`)) {
      return dirname(currentDir);
    }

    // Búsqueda de package.json
    let searchDir = currentDir;
    while (searchDir !== "/" && searchDir !== ".") {
      if (existsSync(join(searchDir, "package.json"))) {
        return searchDir;
      }
      const parent = dirname(searchDir);
      if (parent === searchDir) break;
      searchDir = parent;
    }

    // Fallback
    return dirname(entryFile);
  }
}
