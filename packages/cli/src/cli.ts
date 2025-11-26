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
} from "@clack/prompts";
import { downloadTemplate } from "giget"; // Para descargar plantillas

const version = "0.0.1";
const cli = cac("karin");

// --- Comando: NEW ---
cli
  .command("new [name]", "Create a new Karin-JS project")
  .action(async (name) => {
    // 1. Intro bonita
    intro(pc.bgCyan(pc.black(" 🦊 Karin-JS Creator ")));

    // 2. Preguntar nombre si no se pasó
    if (!name) {
      const namePrompt = await text({
        message: "What is the name of your project?",
        placeholder: "my-karin-api",
        validate(value) {
          if (value.length === 0) return `Value is required!`;
        },
      });

      if (isCancel(namePrompt)) {
        cancel("Operation cancelled.");
        process.exit(0);
      }
      name = namePrompt;
    }

    // 3. Seleccionar Template
    const templateType = await select({
      message: "Pick a project type.",
      options: [
        {
          value: "hono",
          label: "Edge / Serverless (Hono Adapter)",
          hint: "Recommended",
        },
        { value: "h3", label: "High Performance (H3 Adapter)" },
      ],
    });

    if (isCancel(templateType)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    // 4. Simular (o ejecutar) la creación
    const s = spinner();
    s.start("Creating your project...");

    try {
      // AQUÍ VA LA MAGIA DE GIGET (Cuando tengamos los repos)
      // await downloadTemplate(`github:karin-js/starter-${templateType}`, {
      //    dir: name,
      // });

      // Por ahora simulamos retardo
      await new Promise((resolve) => setTimeout(resolve, 2000));

      s.stop("Project created successfully!");
    } catch (e) {
      s.stop("Failed to create project");
      cancel("Error downloading template.");
      process.exit(1);
    }

    // 5. Outro con instrucciones
    const nextSteps = `
      ${pc.green("cd")} ${name}
      ${pc.green("bun install")}
      ${pc.green("bun run dev")}
    `;

    outro(`You're all set! \n${nextSteps}`);
  });

// --- Comando: INFO ---
cli.command("info", "Display project details").action(() => {
  console.log(pc.bold(pc.cyan(`\n🦊 Karin-JS CLI v${version}\n`)));
  console.log(pc.green("  System:"));
  console.log(`    OS: ${process.platform} ${process.arch}`);
  console.log(`    Bun: ${Bun.version}`);
  // ...
});

cli.help();
cli.version(version);
cli.parse();
