// examples/playground/src/guards/auth.guard.ts
import {
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@karin-js/core";

export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Nota: Como getRequest devuelve el objeto nativo (Request de Bun/Fetch),
    // podemos usar la API estándar de Request.

    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      throw new UnauthorizedException("No token provided");
    }

    // Aquí validarías el token real
    return true;
  }
}
