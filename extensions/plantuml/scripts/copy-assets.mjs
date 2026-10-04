import { copyFile, cp, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("@plantuml/core/package.json"));
const vendorDirectory = resolve(extensionRoot, "media/plantuml");
const standardLibraryDirectory = resolve(
  extensionRoot,
  "scripts/stdlib-assets"
);

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

for (const entry of await readdir(standardLibraryDirectory)) {
  await cp(
    resolve(standardLibraryDirectory, entry),
    resolve(vendorDirectory, entry),
    { recursive: true }
  );
}
