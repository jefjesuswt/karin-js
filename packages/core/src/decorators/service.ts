import "reflect-metadata";
import { singleton } from "tsyringe";

/**
 * Decorador para marcar una clase como Servicio (Provider).
 * Por defecto, registra la clase como Singleton en el contenedor de DI.
 */
export function Service(): ClassDecorator {
  return (target: any) => {
    // Registramos como Singleton usando tsyringe
    singleton()(target);
  };
}
