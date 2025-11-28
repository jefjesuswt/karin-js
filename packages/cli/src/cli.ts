import { cac } from "cac";
import pc from "picocolors";
import {
  intro,
  outro,
  text,
  select,
  spinner,
  isCancel,
  cancel,
  confirm,
  note,
} from "@clack/prompts";
import { downloadTemplate } from "giget";
import { join } from "path";
import { GeneratorService } from "./services/generator.service";
import { existsSync, readFileSync } from "fs";
import { updateKarinDependencies } from "./utils/dependencies";

const version = "0.0.1";
const cli = cac("karin");

const TEMPLATE_OWNER = "jefjesuswt";

cli
  .command("new [name]", "Create a new Karin-JS project")
  .action(async (name) => {
    console.clear();
    intro(pc.bgCyan(pc.black(" 🦊 Karin-JS Creator ")));

    if (!name) {
      const namePrompt = await text({
        message: "What is the name of your project?",
        placeholder: "my-karin-api",
        initialValue: "my-karin-api",
        validate(value) {
          if (value.length === 0) return `Value is required!`;
          if (/[^a-z0-9-_]/i.test(value))
            return "Use only letters, numbers, dashes and underscores.";
        },
      });

      if (isCancel(namePrompt)) {
        cancel("Operation cancelled.");
        process.exit(0);
      }
      name = namePrompt;
    }

    const templateType = await select({
      message: "Pick a project type.",
      options: [
        { value: "h3", label: "High Performance (H3)", hint: "Recommended" },
        { value: "hono", label: "Edge / Serverless (Hono)" },
      ],
    });

    if (isCancel(templateType)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    const initGit = await confirm({
      message: "Initialize a new git repository?",
      initialValue: true,
    });
    if (isCancel(initGit)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    const installDeps = await confirm({
      message: "Install dependencies now? (via Bun)",
      initialValue: true,
    });
    if (isCancel(installDeps)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    const s = spinner();
    s.start("Scaffolding project...");

    const targetDir = join(process.cwd(), name);

    try {
      const templateSource = `github:${TEMPLATE_OWNER}/karin-template-${templateType}`;

      await downloadTemplate(templateSource, {
        dir: targetDir,
        force: true,
      });

      s.message("Template downloaded!");

      await updateKarinDependencies(targetDir);

      if (initGit) {
        await Bun.spawn(["git", "init"], {
          cwd: targetDir,
          stdout: "ignore",
          stderr: "ignore",
        }).exited;
      }

      if (installDeps) {
        s.message("Installing dependencies...");
        await Bun.spawn(["bun", "install"], {
          cwd: targetDir,
          stdout: "ignore",
          stderr: "inherit",
        }).exited;
      }

      s.stop("🚀 Project created successfully!");

      const nextSteps = [
        `cd ${name}`,
        installDeps ? null : `bun install`,
        `bun run dev`,
      ].filter(Boolean);

      note(nextSteps.join("\n"), "Next steps:");
      outro(`Enjoy building with ${pc.cyan("Karin-JS")}! 🦊`);
    } catch (error: any) {
      s.stop("❌ Failed to create project");
      console.error(pc.red(error.message));
      if (error.message.includes("404")) {
        console.log(pc.yellow(`\nTip: Template '${templateType}' not found.`));
      }
      process.exit(1);
    }
  });

// --- Comando: GENERATE ---
cli
  .command("generate <type> [name]", "Generate a new element")
  .alias("g")
  .option("-d, --dry-run", "Report actions without creating files")
  .action(async (type, name, options) => {
    // ✅ CORRECCIÓN: Argumentos correctos (type, name, options)
    if (!name) {
      const namePrompt = await text({
        message: "What is the name of the element?",
        placeholder: "users",
        validate: (value) => (!value ? "Value is required!" : undefined),
      });
      if (isCancel(namePrompt)) process.exit(0);
      name = namePrompt.toString();
    }

    const generator = new GeneratorService(process.cwd(), options.dryRun);

    try {
      await generator.generate(type, name);
    } catch (error: any) {
      console.error(pc.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

cli.command("doctor", "Check project health").action(() => {
  console.log(pc.cyan("\n🚑 Karin-JS Doctor\n"));

  const tsconfigPath = join(process.cwd(), "tsconfig.json");

  if (!existsSync(tsconfigPath)) {
    console.log(pc.red("❌ tsconfig.json not found!"));
    return;
  }

  try {
    // Bun lee JSON nativamente, pero para asegurar usamos JSON.parse
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
    const compilerOptions = tsconfig.compilerOptions || {};

    const checks = [
      { name: "emitDecoratorMetadata", required: true },
      { name: "experimentalDecorators", required: true },
      { name: "strict", required: true },
    ];

    let allGood = true;

    for (const check of checks) {
      if (compilerOptions[check.name] === check.required) {
        console.log(pc.green(`✅ ${check.name} is enabled`));
      } else {
        console.log(
          pc.red(`❌ ${check.name} MUST be set to ${check.required}`)
        );
        allGood = false;
      }
    }

    if (allGood) {
      console.log(pc.green("\n✨ Everything looks healthy! Ready to code."));
    } else {
      console.log(
        pc.yellow("\n⚠️  Please fix the issues above in your tsconfig.json")
      );
    }
  } catch (e) {
    console.log(pc.red("❌ Failed to parse tsconfig.json"));
  }
});

// --- Comando: INFO ---
cli.command("info", "Display project details").action(() => {
  console.log(pc.bold(pc.cyan(`\n🦊 Karin-JS CLI v${version}\n`)));
  console.log(pc.green("  System:"));
  console.log(`    OS: ${process.platform} ${process.arch}`);
  console.log(`    Bun: ${Bun.version}`);
  console.log(pc.green("  Framework:"));
  console.log(`    Core: Installed (Workspace)`);
});

cli.help();
cli.version(version);
cli.parse();
