import { toPascalCase, toKebabCase } from "../utils/formatting";

export function generateControllerTemplate(name: string) {
  const className = toPascalCase(name);
  const routeName = toKebabCase(name);

  return `import { Controller, Get } from "@karin-js/core";

@Controller("/${routeName}")
export class ${className}Controller {
  @Get("/")
  findAll() {
    return { message: "This action returns all ${routeName}" };
  }
}
`;
}
