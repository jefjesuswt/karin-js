import "reflect-metadata";
// ❌ ELIMINADOS imports top-level de 'path' y 'fs' para compatibilidad Edge
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
  plugins?: any[];
  globalFilters?: any[];
  globalGuards?: any[];
  globalPipes?: any[];
}

export class KarinFactory {
  private static logger = new Logger("KarinFactory");

  static async create(
    adapter: IHttpAdapter,
    options: KarinFactoryOptions = {}
  ): Promise<KarinApplication> {

    // 1. Detección de raíz (MODIFICADO: Ahora es asíncrono y condicional)
    let root = "/";

    // Solo intentamos buscar el root si vamos a escanear. 
    // Si scan es false (Serverless), nos ahorramos importar 'path'/'fs'.
    if (options.scan !== false) {
      root = options.cwd ?? (await KarinFactory.findProjectRoot());
    }

    const app = new KarinApplication(adapter, root);
    const explorer = new RouterExplorer(adapter);

    // 1.5. Registrar Plugins (ANTES del escaneo para DI)
    if (options.plugins) {
      for (const plugin of options.plugins) {
        app.use(plugin);
      }
    }

    // 1.6. Registrar Global Filters, Guards, Pipes (ANTES del escaneo)
    if (options.globalFilters) {
      app.useGlobalFilters(...options.globalFilters);
    }
    if (options.globalGuards) {
      app.useGlobalGuards(...options.globalGuards);
    }
    if (options.globalPipes) {
      app.useGlobalPipes(...options.globalPipes);
    }

    // 2. Carga Manual (ESTRATEGIA SERVERLESS / MANUAL)
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
      // retornamos inmediatamente.
      if (!options.scan) {
        return app;
      }
    }

    // 3. Escaneo Automático (ESTRATEGIA SERVIDOR TRADICIONAL)
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
    // 🛡️ Lazy import de 'path' para no romper en Edge
    let join: any;
    try {
      // Usamos variable para engañar al bundler si fuera necesario, 
      // aunque el dynamic import suele ser suficiente.
      const pathMod = await import("path");
      join = pathMod.join;
    } catch {
      this.logger.warn("Path module not available (Edge environment). Skipping scan.");
      return;
    }

    const scanPath =
      typeof scanOption === "string"
        ? scanOption
        : join("src", "**", "*.controller.ts");

    this.logger.info(`Scanning files in: ${scanPath}...`);

    try {
      // ⚠️ DYNAMIC IMPORT: Vital para compatibilidad
      if (typeof Bun !== "undefined") {
        // 🛡️ TRUCO: Usamos una variable para el nombre del paquete.
        // Esto evita que Wrangler/Esbuild intenten resolver "bun" estáticamente y fallen.
        const bunPkg = "bun";
        const { Glob } = await import(bunPkg);

        const globScanner = new Glob(scanPath);

        for await (const file of globScanner.scan(root)) {
          const absolutePath = join(root, file);
          await this.loadModule(absolutePath, explorer, app, strict);
        }
      } else {
        // Fallback futuro para Node.js
        this.logger.warn(
          "Auto-scan is currently optimized for Bun runtime. Skipping scan."
        );
      }
    } catch (e: any) {
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

  private static async findProjectRoot(): Promise<string> {
    try {
      // 🛡️ Lazy imports de 'fs' y 'path'
      // Esto solo se ejecuta si scan !== false, así que en Serverless nunca entra aquí.
      const { join, dirname } = await import("path");
      const { existsSync } = await import("fs");

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
      return "/"; // Fallback seguro
    }
  }
}