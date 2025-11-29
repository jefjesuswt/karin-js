import { toPascalCase } from "../utils/formatting";

export function generateServiceTemplate(name: string, withCrud = false) {
  const className = toPascalCase(name);

  if (withCrud) {
    return `import { Service } from "@karin-js/core";
import { type Create${className}Dto } from "./dtos/create-${name}.dto";
import { type Update${className}Dto } from "./dtos/update-${name}.dto";

@Service()
export class ${className}Service {


  create(data: Create${className}Dto) {
    return { id: Math.floor(Math.random() * 1000), ...data };
  }

  findAll() {
    return "This action returns all ${name}";
  }

  findOne(id: string) {
    return \`This action returns a #\${id} ${name}\`;
  }

  update(id: string, data: Update${className}Dto) {
    return \`This action updates a #\${id} ${name}\`;
  }

  remove(id: string) {
    return \`This action removes a #\${id} ${name}\`;
  }
}
`;
  }

  return `import { Service } from "@karin-js/core";

@Service()
export class ${className}Service {
  findAll() {
    return "This action returns all ${name}";
  }
}
`;
}
