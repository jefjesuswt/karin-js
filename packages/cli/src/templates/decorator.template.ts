import { toPascalCase } from "../utils/formatting";

export function generateDecoratorTemplate(name: string) {
  const className = toPascalCase(name);

  return `import { createParamDecorator, type ExecutionContext } from "@karin-js/core";

export const ${className} = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // TODO: Implement your logic here
    // return request.user;
    return null;
  }
);
`;
}
