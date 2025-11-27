import { toPascalCase } from "../utils/formatting";

export function generateServiceTemplate(name: string) {
  const className = toPascalCase(name);

  return `import { Service } from "@karin-js/core";

@Service()
export class ${className}Service {
  findAll() {
    return "This action returns all ${name}";
  }
}
`;
}
