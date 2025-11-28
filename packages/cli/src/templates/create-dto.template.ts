import { toPascalCase } from "../utils/formatting";

export function generateCreateDtoTemplate(name: string) {
  const className = toPascalCase(name);

  return `import { z } from "zod";

export const ${className}Schema = z.object({
  name: z.string().min(1, "Name is required"),

});

export type ${className}Dto = z.infer<typeof ${className}Schema>;
`;
}
