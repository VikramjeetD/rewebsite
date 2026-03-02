import { cpSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const cesiumRoot = join(dirname(require.resolve("cesium/package.json")), "Build", "Cesium");
const dest = join(process.cwd(), "public", "cesium");

mkdirSync(dest, { recursive: true });

for (const dir of ["Workers", "Assets", "ThirdParty", "Widgets"]) {
  cpSync(join(cesiumRoot, dir), join(dest, dir), { recursive: true });
}

console.log("Cesium static assets copied to public/cesium/");
