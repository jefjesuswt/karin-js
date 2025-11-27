import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import pc from "picocolors";
import { getLatestVersion } from "./registry";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export async function updateKarinDependencies(projectPath: string) {
  const pkgPath = join(projectPath, "package.json");

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;

  let updatedCount = 0;

  const updateDeps = async (deps?: Record<string, string>) => {
    if (!deps) return;

    for (const [name, version] of Object.entries(deps)) {
      if (name.startsWith("@karin-js/")) {
        const latest = await getLatestVersion(name);

        if (latest !== "latest" && !version.includes(latest)) {
          deps[name] = `^${latest}`;
          updatedCount++;
        }
      }
    }
  };

  console.log(pc.dim("   Checking for latest framework versions..."));

  await updateDeps(pkg.dependencies);
  await updateDeps(pkg.devDependencies);

  if (updatedCount > 0) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log(
      pc.green(
        `   Updated ${updatedCount} Karin-JS packages to latest stable version.`
      )
    );
  }
}
