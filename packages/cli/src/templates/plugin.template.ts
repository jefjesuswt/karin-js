import { toPascalCase } from "../utils/formatting";

export function generatePluginTemplate(name: string) {
  const className = toPascalCase(name);

  return `import { type KarinPlugin, type KarinApplication, Logger } from "@karin-js/core";

export class ${className}Plugin implements KarinPlugin {
  name = "${className}Plugin";
  private logger = new Logger(this.name);

  constructor(
    // private readonly options: any
  ) {}

  install(app: KarinApplication) {
    // Register services in DI container or configure app
  }

  async onPluginInit() {
    this.logger.log("Initializing plugin...");
    // Connect to DB, etc.
  }

  async onPluginDestroy() {
    this.logger.log("Destroying plugin...");
  }
}
`;
}
