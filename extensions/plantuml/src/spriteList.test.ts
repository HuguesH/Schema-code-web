import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { expandIncludes } from "./includeResolver";
import { createSpriteListSvg } from "./spriteList";

async function expandExample(fileName: string): Promise<string> {
  const examplesDirectory = resolve(process.cwd(), "examples");
  const sourceUri = resolve(examplesDirectory, fileName);
  return expandIncludes(await readFile(sourceUri, "utf8"), sourceUri, {
    resolve: (parentUri, includePath) =>
      resolve(dirname(parentUri), includePath),
    read: async (uri) => readFile(uri, "utf8")
  });
}

test("rend my-sprites-list en planche d'icônes et non en diagramme PlantUML", async () => {
  const source = await expandExample("my-sprites-list.puml");
  const svg = createSpriteListSvg(source);

  assert.ok(svg);
  assert.match(svg, /^<svg\b[^>]*role="img"/);
  assert.match(svg, /width="880" height="600"/);
  assert.equal((svg.match(/<text\b/g) ?? []).length, 15);
  assert.match(svg, />management-console<\/text>/);
  assert.match(svg, />idp-keycloak<\/text>/);
  assert.match(svg, />user-tele<\/text>/);
  assert.doesNotMatch(svg, /listsprites|participant Alice/);
});

test("laisse le diagramme de séquence avec sprites au moteur sans commande listsprites", async () => {
  const source = await expandExample("sequence-idp-auth-with-logo.puml");

  assert.equal(createSpriteListSvg(source), undefined);
  assert.match(source, /participant "<\$user>/);
  assert.match(source, /sprite idp-keycloak <svg/);
});

test("ne remplace pas le rendu des diagrammes sans commande listsprites", () => {
  assert.equal(
    createSpriteListSvg("@startuml\nAlice -> Bob\n@enduml"),
    undefined
  );
});

test("signale listsprites lorsqu'aucun sprite SVG n'est disponible", () => {
  assert.throws(
    () => createSpriteListSvg("@startuml\nlistsprites\n@enduml"),
    /aucune définition de sprite SVG/
  );
});
