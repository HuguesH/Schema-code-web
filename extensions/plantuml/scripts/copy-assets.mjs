import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("@plantuml/core/package.json"));
const vendorDirectory = resolve(extensionRoot, "media/plantuml");

await mkdir(vendorDirectory, { recursive: true });

for (const file of [
  "plantuml.js",
  "viz-global.js",
  "themes.js",
  "emoji.js",
  "openiconic.js",
  "LICENSE"
]) {
  await copyFile(resolve(packageRoot, file), resolve(vendorDirectory, file));
}
