import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, basename, relative } from "path";
import pc from "picocolors";
import { spinner, note } from "@clack/prompts";
import { toKebabCase, removeSuffix, toPascalCase } from "../utils/formatting";
import { findSrcDir } from "../utils/paths";

// Importa tus templates aquí (asegúrate de haberlos creado como vimos antes)
import { generateControllerTemplate } from "../templates/controller.template";
import { generateServiceTemplate } from "../templates/service.template";
import { generateEntityTemplate } from "../templates/entity.template";
import { generateGuardTemplate } from "../templates/guard.template";
import { generateFilterTemplate } from "../templates/filter.template";
import { generatePluginTemplate } from "../templates/plugin.template";
import { generateDecoratorTemplate } from "../templates/decorator.template";

type GeneratorType =
  | "controller"
  | "service"
  | "entity"
  | "guard"
  | "filter"
  | "resource"
  | "plugin"
  | "decorator";

export class GeneratorService {
  private createdFiles: string[] = [];

  constructor(private readonly cwd: string, private readonly dryRun: boolean) {}

  public async generate(type: GeneratorType, rawName: string) {
    const s = spinner();
    s.start(`Scaffolding ${type}...`);

    try {
      const srcPath = findSrcDir(this.cwd);

      // 1. Limpieza inteligente: "ProductsController" -> "Products"
      // Solo si NO es un recurso (porque el recurso usa el nombre base)
      let cleanName = rawName;
      if (type !== "resource") {
        cleanName = removeSuffix(rawName, type);
      }

      const featureName = basename(cleanName);
      const pathPrefix = dirname(cleanName) === "." ? "" : dirname(cleanName);
      // Estructura: src/feature-name/
      const targetDir = join(srcPath, pathPrefix, toKebabCase(featureName));

      switch (type) {
        case "controller":
          this.writeFile(
            targetDir,
            featureName,
            "controller",
            generateControllerTemplate
          );
          break;
        case "service":
          this.writeFile(
            targetDir,
            featureName,
            "service",
            generateServiceTemplate
          );
          break;
        case "entity":
          this.writeFile(
            targetDir,
            featureName,
            "entity",
            generateEntityTemplate
          );
          break;
        case "guard":
          this.writeFile(
            targetDir,
            featureName,
            "guard",
            generateGuardTemplate
          );
          break;
        case "filter":
          this.writeFile(
            targetDir,
            featureName,
            "filter",
            generateFilterTemplate
          );
          break;
        case "plugin":
          // Plugins suelen ir en src/plugins o la raíz de feature
          this.writeFile(
            targetDir,
            featureName,
            "plugin",
            generatePluginTemplate
          );
          break;
        case "decorator":
          this.writeFile(
            targetDir,
            featureName,
            "decorator",
            generateDecoratorTemplate
          );
          break;
        case "resource":
          await this.generateResource(targetDir, featureName);
          break;
        default:
          throw new Error(`Unknown generator type: ${type}`);
      }

      s.stop(`Successfully generated ${type} ${pc.cyan(featureName)}`);

      // Resumen bonito
      if (this.createdFiles.length > 0) {
        const fileList = this.createdFiles
          .map((f) => `${pc.green("CREATE")} ${f}`)
          .join("\n");

        note(fileList, "Changes applied");
      }
    } catch (error: any) {
      s.stop("Failed to generate");
      throw error;
    }
  }

  private async generateResource(targetDir: string, name: string) {
    // Limpiamos 'Resource' del nombre si el usuario lo puso
    const cleanName = removeSuffix(name, "resource");

    this.writeFile(
      targetDir,
      cleanName,
      "controller",
      generateControllerTemplate
    );
    this.writeFile(targetDir, cleanName, "service", generateServiceTemplate);
    this.writeFile(
      join(targetDir, "entities"),
      cleanName,
      "entity",
      generateEntityTemplate
    );
    // DTOs opcional
    this.writeFile(
      join(targetDir, "dtos"),
      `create-${cleanName}`,
      "dto",
      (n) => `export class Create${toPascalCase(n)}Dto {}`
    );
  }

  private writeFile(
    dir: string,
    name: string,
    suffix: string,
    templateFn: (n: string) => string
  ) {
    const kebabName = toKebabCase(name);
    const fileName = `${kebabName}.${suffix}.ts`;
    const filePath = join(dir, fileName);
    const content = templateFn(name);

    const relativePath = relative(this.cwd, filePath);

    if (this.dryRun) {
      console.log(pc.blue(`[DryRun] Would create: ${relativePath}`));
      return;
    }

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (existsSync(filePath)) {
      console.log(pc.yellow(`   SKIP ${relativePath} (Already exists)`));
      return;
    }

    writeFileSync(filePath, content);
    this.createdFiles.push(relativePath);
  }
}
