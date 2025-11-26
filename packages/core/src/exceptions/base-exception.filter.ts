import { Logger } from "../logger";
import { HttpException } from "./http.exception";
import type { ExceptionFilter, ArgumentsHost } from "../interfaces";
import { Catch } from "../decorators/filters";

@Catch()
export class BaseExceptionFilter implements ExceptionFilter {
  private logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    let status = 500;
    let body: any = { message: "Internal Server Error" };

    if (exception instanceof HttpException) {
      status = exception.status;
      const response = exception.response;
      if (typeof response === "object") {
        body = { statusCode: status, ...response };
      } else {
        body = { statusCode: status, message: response };
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);

      if (process.env.NODE_ENV !== "production") {
        body.details = exception.message;
      }
    }

    // Retornamos una respuesta estándar
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
