import { type CanActivate, type IHttpAdapter } from "@karin-js/core";
import { injectable } from "tsyringe";

@injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: any): Promise<boolean> {
    // Aquí es donde brilla nuestra abstracción:
    // El 'context' es H3Event o Hono Context, pero no sabemos cuál es.
    // En el futuro, pasaremos un ExecutionContext unificado.

    // Por ahora, para probar, asumimos que el adaptador o el framework
    // nos permite acceder a los headers de alguna forma estándar o
    // inyectaremos el adaptador si fuera necesario.

    // NOTA: Como aún no hemos estandarizado el ExecutionContext en el Factory
    // para los Guards, vamos a hacer una validación simple sobre el objeto.
    // (Esto es algo que notaremos en el Roadmap que falta refinar).

    console.log("🛡️ AuthGuard verificando...");
    return true; // Permitimos pasar por ahora para probar
  }
}
