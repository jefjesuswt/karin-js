import { toPascalCase, toKebabCase } from "../utils/formatting";

export function generateUpdateDtoTemplate(name: string) {
  const className = toPascalCase(name);

  const baseName = name.replace(/^update-/, "");

  const baseKebab = toKebabCase(baseName);
  const basePascal = toPascalCase(baseName);

  const createSchemaName = `Create${basePascal}Schema`;
  const importFile = `create-${baseKebab}.dto`;

  return `import { z } from "zod";
import { ${createSchemaName} } from "./${importFile}";

export const ${className}Schema = ${createSchemaName}.partial();

export type ${className}Dto = z.infer<typeof ${className}Schema>;
`;
}
