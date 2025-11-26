import type {
  ExecutionContext,
  HttpArgumentsHost,
  IHttpAdapter,
  Type,
} from "../interfaces";

export class KarinExecutionContext implements ExecutionContext {
  constructor(
    // Hacemos el adaptador genérico para que TS sepa qué tipos maneja
    private readonly adapter: IHttpAdapter<any, any, any>,
    private readonly platformContext: any,
    private readonly controllerClass: Type<any>,
    private readonly handler: Function
  ) {}

  getClass<T = any>(): Type<T> {
    return this.controllerClass;
  }

  getHandler(): Function {
    return this.handler;
  }

  // Implementación directa requerida por ArgumentsHost
  // Eliminamos los 'as T' innecesarios si la firma es compatible
  getRequest<T = any>(): T {
    return this.adapter.getRequest(this.platformContext) as unknown as T;
    // Nota profesional: Aquí el 'unknown as T' sigue siendo necesario a veces
    // porque T es arbitrario. Pero una forma MEJOR es definir que getRequest devuelve lo que el adaptador devuelve.
    // Sin embargo, para cumplir la interfaz estricta <T>, el casting es inevitable en el borde (boundary).
    // La alternativa limpia es no prometer T arbitrario si no podemos cumplirlo,
    // pero la interfaz ArgumentsHost de NestJS funciona así.
    // La forma MÁS limpia es confiar en que el usuario pedirá el tipo correcto.
  }

  getResponse<T = any>(): T {
    return this.adapter.getResponse(this.platformContext) as unknown as T;
  }

  getNext<T = any>(): T {
    return null as unknown as T; // next() no siempre existe en todos los contextos
  }

  switchToHttp(): HttpArgumentsHost {
    return this;
  }
}
