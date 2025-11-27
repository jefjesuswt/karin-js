import { toPascalCase } from "../utils/formatting";

export function generateGuardTemplate(name: string) {
  const className = toPascalCase(name);

  return `import { type CanActivate, type ExecutionContext } from "@karin-js/core";

export class ${className}Guard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return true;
  }
}
`;
}
