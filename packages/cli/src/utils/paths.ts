import { existsSync } from "fs";
import { join } from "path";

export function findSrcDir(cwd: string): string {
  const possibleSrc = join(cwd, "src");

  if (existsSync(possibleSrc)) {
    return possibleSrc;
  }

  // Si estamos dentro de src (ej: src/users), devolvemos el cwd actual
  // o subimos un nivel si es necesario. Por simplicidad y estándar,
  // KarinJS espera que ejecutes el comando desde la raíz.

  throw new Error(
    "Could not find 'src' folder. Please run this command from the root of your Karin-JS project."
  );
}
