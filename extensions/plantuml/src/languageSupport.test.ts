import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getCompletions, validateLanguage } from "./languageSupport";

test("PlantUML valide les marqueurs d'un diagramme complet", () => {
  assert.deepEqual(
    validateLanguage("plantuml", "@startuml\nAlice -> Bob: Salut\n@enduml"),
    []
  );
});

test("PlantUML signale les marqueurs de fermeture manquants", () => {
  const issues = validateLanguage("plantuml", "@startuml\nAlice -> Bob");
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /@enduml/);
  assert.equal(issues[0].severity, "error");
});

test("PlantUML ignore les délimiteurs dans les commentaires et chaînes", () => {
  assert.deepEqual(
    validateLanguage(
      "plantuml",
      "@startuml\n' }\nparticipant \"A { B\"\n/' } '/\n@enduml"
    ),
    []
  );
});

test("PlantUML ignore les marqueurs dans les commentaires", () => {
  assert.deepEqual(
    validateLanguage("plantuml", "/'\n@startuml\n@enduml\n'/"),
    []
  );
});

test("Structurizr DSL accepte les blocs et les accolades dans les chaînes", () => {
  assert.deepEqual(
    validateLanguage(
      "structurizr",
      'workspace "Architecture" {\n  model {\n    user = person "Utilisateur {externe}"\n  }\n}'
    ),
    []
  );
});

test("Structurizr DSL signale les chaînes et accolades incomplètes", () => {
  const issues = validateLanguage(
    "structurizr",
    'workspace "Architecture" {\n  model {\n    user = person "Utilisateur\n  }\n'
  );
  assert.ok(issues.some((issue) => issue.message.includes("chaîne")));
  assert.ok(issues.some((issue) => issue.message.includes("délimiteur fermant")));
});

test("l'exemple Structurizr est syntaxiquement équilibré", () => {
  const source = readFileSync("examples/workspace.dsl", "utf8");
  assert.deepEqual(validateLanguage("structurizr", source), []);
});

test("chaque langage propose ses constructions usuelles", () => {
  const plantUml = getCompletions("plantuml");
  const structurizr = getCompletions("structurizr");
  assert.ok(plantUml.some(({ label }) => label === "@startuml"));
  assert.ok(structurizr.some(({ label }) => label === "workspace"));
  assert.equal(new Set(plantUml.map(({ label }) => label)).size, plantUml.length);
  assert.equal(new Set(structurizr.map(({ label }) => label)).size, structurizr.length);
});

test("le manifeste associe les formats PlantUML et Structurizr attendus", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    contributes: {
      languages: Array<{ id: string; extensions: string[] }>;
      grammars: Array<{ language: string; path: string }>;
    };
  };
  const languageExtensions = new Map(
    manifest.contributes.languages.map(({ id, extensions }) => [id, extensions])
  );

  assert.deepEqual(languageExtensions.get("plantuml"), [
    ".puml",
    ".plantuml",
    ".pu",
    ".iuml"
  ]);
  assert.deepEqual(languageExtensions.get("structurizr"), [".dsl", ".structurizr"]);
  assert.equal(
    manifest.contributes.grammars.filter(({ language }) =>
      languageExtensions.has(language)
    ).length,
    2
  );
});
