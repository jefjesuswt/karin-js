import { UseInterceptors, type CallHandler, type ExecutionContext, type KarinInterceptor } from "@karin-js/core";
import type { Context, Next } from "hono";

// Wrapper que convierte Hono Middleware -> Karin Interceptor
class HonoMiddlewareWrapper implements KarinInterceptor {
    constructor(private readonly middleware: (c: Context, next: Next) => Promise<void | Response>) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
        const honoCtx = context.getPlatformContext<Context>();

        // Ejecutamos el middleware de Hono
        await this.middleware(honoCtx, async () => {
            const result = await next.handle();

            // Normalizamos el resultado y lo asignamos a c.res para que el middleware lo vea
            if (result instanceof Response) {
                honoCtx.res = result;
            } else if (result === null || result === undefined) {
                honoCtx.res = new Response(null, { status: 204 });
            } else if (typeof result === "object") {
                honoCtx.res = honoCtx.json(result);
            } else {
                honoCtx.res = honoCtx.text(String(result));
            }
        });

        // Si el middleware retornó una respuesta (ej: cache hit), la devolvemos.
        // Si no (void), devolvemos c.res que fue seteado arriba.
        return honoCtx.res;
    }
}

// El Decorador para el usuario
export function UseHono(middleware: (c: Context, next: Next) => Promise<void | Response>) {
    return UseInterceptors(new HonoMiddlewareWrapper(middleware));
}
