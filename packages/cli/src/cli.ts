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

const version = "0.0.1";
const cli = cac("karin");

// 👇 CONFIGURACIÓN DE TEMPLATES
// Cambia esto por tu organización o usuario de GitHub donde alojarás los starters
const TEMPLATE_OWNER = "jefjesuswt";
// Patrón: github:usuario/karin-template-{tipo}

cli
  .command("new [name]", "Create a new Karin-JS project")
  .action(async (name) => {
    console.clear();
    intro(pc.bgCyan(pc.black(" 🦊 Karin-JS Creator ")));

    // 1. Obtener nombre del proyecto
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

    // 2. Seleccionar Template
    const templateType = await select({
      message: "Pick a project type.",
      options: [
        {
          value: "hono",
          label: "Edge / Serverless",
          hint: "Uses Hono Adapter (Recommended for Edge)",
        },
        {
          value: "h3",
          label: "High Performance",
          hint: "Uses H3 Adapter (Recommended for Node/Bun)",
        },
        {
          value: "bare",
          label: "Barebones",
          hint: "Minimal setup without extra plugins",
        },
      ],
    });

    if (isCancel(templateType)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    // 3. Preguntar por Git
    const initGit = await confirm({
      message: "Initialize a new git repository?",
      initialValue: true,
    });

    if (isCancel(initGit)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    // 4. Preguntar por Dependencias
    const installDeps = await confirm({
      message: "Install dependencies now? (via Bun)",
      initialValue: true,
    });

    if (isCancel(installDeps)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    // --- INICIO DEL PROCESO ---
    const s = spinner();
    s.start("Scaffolding project...");

    const targetDir = join(process.cwd(), name);

    try {
      // A. Descargar Template (Giget)
      // Nota: Esto fallará si el repo no existe. Para probar, puedes usar "github:unjs/template" temporalmente
      // o crear tus repos 'karin-template-hono', etc.

      // Para pruebas reales ahora mismo sin tus repos, descomenta la línea de abajo:
      // const templateSource = "github:unjs/template";

      // Producción:
      const templateSource = `github:${TEMPLATE_OWNER}/karin-template-${templateType}`;

      await downloadTemplate(templateSource, {
        dir: targetDir,
        force: true, // Sobrescribir si la carpeta existe (o manejar error antes)
      });

      s.message("Template downloaded!");

      // B. Inicializar Git
      if (initGit) {
        await Bun.spawn(["git", "init"], { cwd: targetDir }).exited;
      }

      // C. Instalar Dependencias
      if (installDeps) {
        s.message("Installing dependencies (this may take a moment)...");
        await Bun.spawn(["bun", "install"], {
          cwd: targetDir,
          stdout: "ignore", // Ocultar output de bun install para mantener la UI limpia
          stderr: "inherit",
        }).exited;
      }

      s.stop("🚀 Project created successfully!");

      // 5. Notas finales
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
        console.log(
          pc.yellow(
            `\nTip: The template '${templateType}' might not exist yet in user '${TEMPLATE_OWNER}'.`
          )
        );
      }

      process.exit(1);
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
