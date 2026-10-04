import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const bundleNames = [
  "adaml",
  "archimate",
  "awslib",
  "awslib10",
  "awslib14",
  "awslib20",
  "azure",
  "bootstrap",
  "bootstrap1.12.1",
  "bootstrap1.13.1",
  "c4",
  "classy",
  "classy-c4",
  "cloudinsight",
  "cloudogu",
  "domainstory",
  "edgy",
  "eip",
  "elastic",
  "gcp",
  "ibm",
  "k8s",
  "kubernetes",
  "logos",
  "material",
  "material2",
  "material2.1.19",
  "material7",
  "material7.4.47",
  "office",
  "osa",
  "osa2",
  "tupadr3"
];

test("embarque tous les bundles standard PlantUML disponibles avec leurs notices", async () => {
  const assetDirectory = resolve(process.cwd(), "scripts/stdlib-assets");
  const sourceFiles = await readdir(assetDirectory);
  const actualBundles = sourceFiles
    .filter((file) => file.endsWith(".min.js"))
    .map((file) => file.slice(0, -".min.js".length))
    .sort();
  assert.deepEqual(actualBundles, [...bundleNames].sort());

  const notice = await readFile(
    resolve(assetDirectory, "THIRD-PARTY-NOTICES.md"),
    "utf8"
  );
  for (const bundle of bundleNames) {
    assert.ok(notice.includes(`\`${bundle}\``), `missing notice for ${bundle}`);
    const bundleStat = await stat(resolve(assetDirectory, `${bundle}.min.js`));
    assert.ok(bundleStat.size > 0, `${bundle} bundle is empty`);
  }
  await stat(resolve(assetDirectory, "licenses/AdaML-COPYING.txt"));
  await stat(resolve(assetDirectory, "licenses/DomainStory-MIT.txt"));
});
