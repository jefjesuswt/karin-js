import { cac } from "cac";
import pc from "picocolors";
// En un entorno real, importarías la versión desde package.json
const version = "0.0.1";

const cli = cac("karin");

// --- Comandos ---

cli.command("info", "Display project details").action(() => {
  console.log(pc.bold(pc.cyan(`\n🦊 Karin-JS CLI v${version}\n`)));
  console.log(pc.green("  System:"));
  console.log(`    OS: ${process.platform} ${process.arch}`);
  console.log(`    Bun: ${Bun.version}`);
  console.log(pc.green("  Framework:"));
  console.log(`    Core: Installed (Workspace)`);
});

cli
  .command("new <name>", "Create a new Karin-JS project")
  .option("--template <template>", "Template to use (hono, h3)", {
    default: "hono",
  })
  .action((name, options) => {
    console.log(pc.cyan(`\n🚀 Creating new project: ${pc.bold(name)}`));
    console.log(`   Template: ${options.template}`);
    console.log(
      pc.yellow("\n⚠️  Scaffolding not implemented yet... come back tomorrow!")
    );
  });

// --- Configuración Global ---

cli.help();
cli.version(version);

// Parsear argumentos
try {
  cli.parse();
} catch (error: any) {
  console.error(pc.red(`\n❌ Error: ${error.message}`));
  process.exit(1);
}
