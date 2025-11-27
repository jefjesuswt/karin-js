import { toPascalCase } from "../utils/formatting";

export function generateEntityTemplate(name: string) {
  const className = toPascalCase(name);

  return `
export class ${className} {
  // TODO: Define your properties here
  // id: string;
}
`;
}
