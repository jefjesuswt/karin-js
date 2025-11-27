import { toPascalCase } from "../utils/formatting";

export function generateFilterTemplate(name: string) {
  const className = toPascalCase(name);

  return `import { Catch, type ExceptionFilter, type ArgumentsHost, HttpException } from "@karin-js/core";

@Catch(HttpException)
export class ${className}Filter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    // const request = ctx.getRequest();
    // const response = ctx.getResponse();
    const status = exception.status;

    return new Response(JSON.stringify({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
`;
}
