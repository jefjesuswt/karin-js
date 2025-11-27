// 1. Definición completa y flexible de la respuesta de NPM
export interface NpmRegistryResponse {
  name: string;
  version: string;
  description?: string;
  // Usamos Record<string, string> para aceptar cualquier dependencia
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dist?: {
    integrity: string;
    shasum: string;
    tarball: string;
    fileCount?: number;
    unpackedSize?: number;
  };
  // Permitimos propiedades extra que no nos interesan por ahora
  [key: string]: unknown;
}

export async function getLatestVersion(packageName: string): Promise<string> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${packageName}/latest`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch version for ${packageName}`);
    }

    // 2. Casting seguro a nuestra interfaz genérica
    const data = (await response.json()) as NpmRegistryResponse;

    return data.version;
  } catch (error) {
    // Fallback silencioso si no hay internet o el paquete no existe
    return "latest";
  }
}
