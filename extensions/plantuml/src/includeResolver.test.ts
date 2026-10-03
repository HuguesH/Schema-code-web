import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, posix, resolve } from "node:path";
import test from "node:test";
import { expandIncludes, type IncludeHost } from "./includeResolver";

function createHost(files: Record<string, string>): IncludeHost {
  return {
    resolve: (parentUri, includePath) =>
      posix.resolve(posix.dirname(parentUri), includePath),
    read: async (uri) => {
      const content = files[uri];
      if (content === undefined) throw new Error("fichier introuvable");
      return content;
    }
  };
}

test("résout les includes locaux imbriqués relativement au fichier inclus", async () => {
  const result = await expandIncludes(
    "@startuml\n!include parts/entities.puml\n@enduml",
    "/project/main.puml",
    createHost({
      "/project/parts/entities.puml": "Alice -> Bob\n!include ../shared/style.iuml",
      "/project/shared/style.iuml": "skinparam monochrome true"
    })
  );

  assert.equal(
    result,
    "@startuml\nAlice -> Bob\nskinparam monochrome true\n@enduml"
  );
});

test("déplie les fichiers de diagramme inclus et sélectionne le diagramme suffixé", async () => {
  const result = await expandIncludes(
    "@startuml\n!include sprites.puml!1\n@enduml",
    "/project/main.puml",
    createHost({
      "/project/sprites.puml":
        "@startuml first\nsprite first <svg/>\n@enduml\n" +
        "@startuml second\nsprite second <svg/>\n@enduml"
    })
  );

  assert.equal(result, "@startuml\nsprite second <svg/>\n@enduml");
});

test("développe les trois includes locaux de l'exemple sequence-idp-auth-with-logo", async () => {
  const root = resolve(process.cwd(), "examples");
  const sourceUri = resolve(root, "sequence-idp-auth-with-logo.puml");
  const source = await readFile(sourceUri, "utf8");
  const readUris: string[] = [];
  const host: IncludeHost = {
    resolve: (parentUri, includePath) =>
      resolve(dirname(parentUri), includePath),
    read: async (uri) => {
      readUris.push(uri);
      return readFile(uri, "utf8");
    }
  };

  assert.equal((source.match(/^\s*!include\b/gm) ?? []).length, 3);
  const expanded = await expandIncludes(source, sourceUri, host);

  assert.deepEqual(
    readUris.map((uri) => posix.basename(uri)).sort(),
    ["drawio-selected-sprite.puml", "skinparams.puml", "softwares-sprites.puml"]
  );
  assert.match(expanded, /sprite user <svg/);
  assert.match(expanded, /sprite idp-keycloak <svg/);
  assert.match(expanded, /skinparam sequenceBackgroundColor transparent/);
  assert.equal((expanded.match(/^\s*@startuml\b/gm) ?? []).length, 1);
  assert.equal((expanded.match(/^\s*@enduml\b/gm) ?? []).length, 1);
  assert.doesNotMatch(expanded, /^\s*!include\b/m);
});

test("développe les deux includes du fichier my-sprites-list", async () => {
  const root = resolve(process.cwd(), "examples");
  const sourceUri = resolve(root, "my-sprites-list.puml");
  const source = await readFile(sourceUri, "utf8");
  const expanded = await expandIncludes(source, sourceUri, {
    resolve: (parentUri, includePath) =>
      resolve(dirname(parentUri), includePath),
    read: async (uri) => readFile(uri, "utf8")
  });

  assert.match(expanded, /sprite user <svg/);
  assert.match(expanded, /sprite idp-keycloak <svg/);
  assert.doesNotMatch(expanded, /^\s*!include\b/m);
  assert.equal((expanded.match(/^\s*@startuml\b/gm) ?? []).length, 1);
  assert.equal((expanded.match(/^\s*@enduml\b/gm) ?? []).length, 1);
});

test("respecte include_once et include_many et laisse le standard PlantUML au moteur", async () => {
  const result = await expandIncludes(
    "!include_once shared.puml\n!include_once shared.puml\n!include_many shared.puml\n!include_many shared.puml\n!include <C4/C4_Context>",
    "/project/main.puml",
    createHost({ "/project/shared.puml": "participant Alice" })
  );

  assert.equal(
    result,
    "participant Alice\nparticipant Alice\nparticipant Alice\n!include <C4/C4_Context>"
  );
});

test("signale une inclusion introuvable et les cycles", async () => {
  await assert.rejects(
    expandIncludes("!include missing.puml", "/project/main.puml", createHost({})),
    /missing\.puml.*fichier introuvable/
  );
  await assert.rejects(
    expandIncludes("!include child.puml", "/project/main.puml", createHost({
      "/project/child.puml": "!include main.puml"
    })),
    /Cycle détecté/
  );
  await assert.rejects(
    expandIncludes("!include sprites.puml!2", "/project/main.puml", createHost({
      "/project/sprites.puml": "@startuml\nsprite one <svg/>\n@enduml"
    })),
    /diagramme 2 n'existe pas/
  );
});

test("refuse les includes distants", async () => {
  await assert.rejects(
    expandIncludes("!includeurl https://example.test/shared.puml", "/project/main.puml", createHost({})),
    /inclusions distantes/
  );
});
