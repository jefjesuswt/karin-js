import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, basename, relative } from "path";
import pc from "picocolors";
import { spinner, note, outro } from "@clack/prompts";
import { toKebabCase, removeSuffix } from "../utils/formatting";
import { findSrcDir } from "../utils/paths";
import {
  generateControllerTemplate,
  generateDecoratorTemplate,
  generateEntityTemplate,
  generateFilterTemplate,
  generateGuardTemplate,
  generatePluginTemplate,
  generateServiceTemplate,
} from "../templates";

// Templates

type GeneratorType =
  | "controller"
  | "service"
  | "entity"
  | "guard"
  | "filter"
  | "resource"
  | "decorator"
  | "plugin";

export class GeneratorService {
  private createdFiles: string[] = [];

  constructor(private readonly cwd: string, private readonly dryRun: boolean) {}

  public async generate(type: GeneratorType, rawName: string) {
    const s = spinner();
    s.start(`Scaffolding ${type}...`);

    try {
      const srcPath = findSrcDir(this.cwd);

      // 1. Limpieza inteligente del nombre
      // Si genera un controller y el usuario puso "UserController", lo dejamos en "User"
      let cleanName = rawName;
      if (type !== "resource") {
        cleanName = removeSuffix(rawName, type);
      }

      const featureName = basename(cleanName);
      const pathPrefix = dirname(cleanName) === "." ? "" : dirname(cleanName);
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
        case "decorator":
          this.writeFile(
            targetDir,
            featureName,
            "decorator",
            generateDecoratorTemplate
          );
          break;

        case "plugin":
          this.writeFile(
            targetDir,
            featureName,
            "plugin",
            generatePluginTemplate
          );
          break;
        case "resource":
          await this.generateResource(targetDir, featureName);
          break;
        default:
          throw new Error(`Unknown generator type: ${type}`);
      }

      s.stop(`Successfully generated ${type} ${pc.cyan(featureName)}`);

      // Mostrar resumen bonito
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
    // Un resource es la suma de varias partes.
    // Limpiamos el nombre por si el usuario puso "UserResource" -> "User"
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
    this.writeFile(
      join(targetDir, "dtos"),
      `create-${cleanName}`,
      "dto",
      (n) => `export class Create${n}Dto {}`
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

    // Para mostrar en consola, usamos ruta relativa al CWD (más limpio)
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
