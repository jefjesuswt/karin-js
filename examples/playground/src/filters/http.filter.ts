import {
  Catch,
  HttpException,
  type ExceptionFilter,
  type ArgumentsHost,
} from "@karin-js/core";

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>(); // En Hono/H3 esto es manejado por el framework, pero devolvemos un objeto Response estandar
    const request = ctx.getRequest<Request>();

    const status = exception.status;
    const msg = exception.response;

    return new Response(
      JSON.stringify({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        error: msg,
        customMessage: "🚀 ¡Este error pasó por el Filtro Enterprise de Karin!",
      }),
      {
        status: status,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
