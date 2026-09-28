export type DiagramLanguage = "plantuml" | "structurizr";

export interface LanguageIssue {
  message: string;
  severity: "error" | "warning";
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface LanguageCompletion {
  label: string;
  detail: string;
  insertText: string;
  snippet?: boolean;
}

const plantUmlCompletions: LanguageCompletion[] = [
  {
    label: "@startuml",
    detail: "Commencer un diagramme PlantUML",
    insertText: "@startuml\n$0\n@enduml",
    snippet: true
  },
  {
    label: "actor",
    detail: "Déclarer un acteur",
    insertText: "actor \"${1:Nom}\" as ${2:alias}",
    snippet: true
  },
  {
    label: "participant",
    detail: "Déclarer un participant",
    insertText: "participant \"${1:Nom}\" as ${2:alias}",
    snippet: true
  },
  {
    label: "relationship",
    detail: "Créer une relation dans un diagramme de séquence",
    insertText: "${1:Source} -> ${2:Cible}: ${3:Message}",
    snippet: true
  },
  {
    label: "note",
    detail: "Ajouter une note",
    insertText: "note ${1:right} of ${2:Participant}\n  ${3:Texte}\nend note",
    snippet: true
  },
  {
    label: "alt",
    detail: "Bloc alternatif d'un diagramme de séquence",
    insertText: "alt ${1:Condition}\n  $0\nelse ${2:Sinon}\n  \nend",
    snippet: true
  },
  {
    label: "loop",
    detail: "Boucle d'un diagramme de séquence",
    insertText: "loop ${1:Condition}\n  $0\nend",
    snippet: true
  },
  {
    label: "class",
    detail: "Déclarer une classe",
    insertText: "class ${1:Nom} {\n  $0\n}",
    snippet: true
  },
  {
    label: "skinparam",
    detail: "Configurer l'apparence du diagramme",
    insertText: "skinparam ${1:Paramètre} ${2:Valeur}",
    snippet: true
  },
  {
    label: "!include",
    detail: "Inclure un fichier ou une bibliothèque PlantUML",
    insertText: "!include ${1:chemin}",
    snippet: true
  },
  ...[
    "participant",
    "actor",
    "boundary",
    "control",
    "entity",
    "database",
    "collections",
    "queue",
    "component",
    "interface",
    "class",
    "object",
    "package",
    "node",
    "cloud",
    "state",
    "usecase",
    "artifact",
    "title",
    "caption",
    "autonumber",
    "activate",
    "deactivate",
    "hide",
    "show",
    "left",
    "right",
    "up",
    "down",
    "if",
    "else",
    "endif",
    "loop",
    "end",
    "opt",
    "par",
    "group"
  ].map((label) => ({
    label,
    detail: "Mot-clé PlantUML",
    insertText: label
  }))
];

const structurizrCompletions: LanguageCompletion[] = [
  {
    label: "workspace",
    detail: "Définir l'espace de travail Structurizr",
    insertText: "workspace \"${1:Nom}\" \"${2:Description}\" {\n  model {\n    $0\n  }\n\n  views {\n  }\n}",
    snippet: true
  },
  {
    label: "person",
    detail: "Déclarer une personne dans le modèle",
    insertText: "${1:user} = person \"${2:Utilisateur}\" \"${3:Description}\"",
    snippet: true
  },
  {
    label: "softwareSystem",
    detail: "Déclarer un système logiciel",
    insertText: "${1:system} = softwareSystem \"${2:Système}\" \"${3:Description}\" {\n  $0\n}",
    snippet: true
  },
  {
    label: "container",
    detail: "Déclarer un conteneur dans un système logiciel",
    insertText: "${1:container} = container \"${2:Nom}\" \"${3:Description}\" \"${4:Technologie}\"",
    snippet: true
  },
  {
    label: "component",
    detail: "Déclarer un composant dans un conteneur",
    insertText: "${1:component} = component \"${2:Nom}\" \"${3:Description}\" \"${4:Technologie}\"",
    snippet: true
  },
  {
    label: "relationship",
    detail: "Définir une relation entre deux éléments",
    insertText: "${1:source} -> ${2:destination} \"${3:Description}\"",
    snippet: true
  },
  {
    label: "views",
    detail: "Définir les vues du modèle",
    insertText: "views {\n  $0\n}",
    snippet: true
  },
  {
    label: "systemContext",
    detail: "Créer une vue de contexte système",
    insertText: "systemContext ${1:system} \"${2:context}\" {\n  include *\n  autolayout lr\n}",
    snippet: true
  },
  {
    label: "containerView",
    detail: "Créer une vue des conteneurs d'un système",
    insertText: "container ${1:system} \"${2:containers}\" {\n  include *\n  autolayout lr\n}",
    snippet: true
  },
  {
    label: "dynamicView",
    detail: "Créer une vue dynamique",
    insertText: "dynamic ${1:system} \"${2:dynamic}\" {\n  $0\n  autolayout lr\n}",
    snippet: true
  },
  {
    label: "styles",
    detail: "Définir les styles des éléments et relations",
    insertText: "styles {\n  element \"${1:Tag}\" {\n    background ${2:#438dd5}\n    color ${3:#ffffff}\n  }\n}",
    snippet: true
  },
  ...[
    "model",
    "person",
    "softwareSystem",
    "container",
    "component",
    "deploymentEnvironment",
    "deploymentNode",
    "infrastructureNode",
    "softwareSystemInstance",
    "containerInstance",
    "views",
    "systemLandscape",
    "systemContext",
    "filtered",
    "dynamic",
    "deployment",
    "include",
    "exclude",
    "autolayout",
    "styles",
    "element",
    "relationship",
    "properties",
    "documentation",
    "configuration",
    "branding",
    "terminology",
    "group",
    "true",
    "false"
  ].map((label) => ({
    label,
    detail: "Mot-clé Structurizr DSL",
    insertText: label
  }))
];

export function getCompletions(language: DiagramLanguage): LanguageCompletion[] {
  const completions = language === "plantuml" ? plantUmlCompletions : structurizrCompletions;
  const labels = new Set<string>();
  return completions.filter(({ label }) => {
    if (labels.has(label)) return false;
    labels.add(label);
    return true;
  });
}

export function validateLanguage(
  language: DiagramLanguage,
  source: string
): LanguageIssue[] {
  const issues = scanDelimiters(source, language);
  if (language === "plantuml") {
    issues.push(...validatePlantUmlMarkers(source));
  } else if (hasCode(source) && !/\bworkspace\b/.test(stripStructurizrComments(source))) {
    issues.push({
      message: "Le DSL Structurizr doit être défini dans un bloc workspace.",
      severity: "warning",
      startLine: 0,
      startCharacter: 0,
      endLine: 0,
      endCharacter: Math.max(1, source.split(/\r\n|\r|\n/, 1)[0].length)
    });
  }
  return issues;
}

function validatePlantUmlMarkers(source: string): LanguageIssue[] {
  const issues: LanguageIssue[] = [];
  const lines = source.split(/\r\n|\r|\n/);
  let active: { kind: string; line: number; character: number } | undefined;
  let sawMarker = false;
  let inBlockComment = false;

  lines.forEach((line, lineIndex) => {
    if (inBlockComment) {
      if (line.includes("'/")) inBlockComment = false;
      return;
    }
    if (/^\s*\/'/.test(line)) {
      inBlockComment = !line.includes("'/");
      return;
    }

    const match = /^\s*@(start|end)([a-z]+)\b/i.exec(line);
    if (!match) return;
    sawMarker = true;
    const character = match.index + match[0].indexOf("@");
    const marker = match[0].slice(match[0].indexOf("@"));
    const action = match[1].toLowerCase();
    const kind = match[2].toLowerCase();

    if (action === "start") {
      if (active) {
        issues.push({
          message: `Le bloc @start${active.kind} précédent n'est pas fermé.`,
          severity: "error",
          startLine: active.line,
          startCharacter: active.character,
          endLine: active.line,
          endCharacter: active.character + active.kind.length + 6
        });
      }
      active = { kind, line: lineIndex, character };
    } else if (!active) {
      issues.push({
        message: `@end${kind} n'a pas de marqueur @start${kind} correspondant.`,
        severity: "error",
        startLine: lineIndex,
        startCharacter: character,
        endLine: lineIndex,
        endCharacter: character + marker.length
      });
    } else if (active.kind !== kind) {
      issues.push({
        message: `@end${kind} ne correspond pas au marqueur @start${active.kind}.`,
        severity: "error",
        startLine: lineIndex,
        startCharacter: character,
        endLine: lineIndex,
        endCharacter: character + marker.length
      });
      active = undefined;
    } else {
      active = undefined;
    }
  });

  if (active) {
    issues.push({
      message: `Le marqueur @start${active.kind} n'a pas de marqueur @end${active.kind}.`,
      severity: "error",
      startLine: active.line,
      startCharacter: active.character,
      endLine: active.line,
      endCharacter: active.character + active.kind.length + 6
    });
  } else if (!sawMarker && hasCode(source)) {
    const lineIndex = lines.findIndex((line) => line.trim() && !line.trimStart().startsWith("'"));
    issues.push({
      message: "Délimitez le diagramme avec des marqueurs @startuml et @enduml.",
      severity: "warning",
      startLine: lineIndex,
      startCharacter: 0,
      endLine: lineIndex,
      endCharacter: Math.max(1, lines[lineIndex].length)
    });
  }

  return issues;
}

function scanDelimiters(source: string, language: DiagramLanguage): LanguageIssue[] {
  const issues: LanguageIssue[] = [];
  const stack: Array<{ opening: string; line: number; character: number }> = [];
  const lines = source.split(/\r\n|\r|\n/);
  let blockCommentStart:
    | { line: number; character: number }
    | undefined;

  lines.forEach((line, lineIndex) => {
    let inString = false;
    let quoteStart = -1;

    for (let character = 0; character < line.length; character += 1) {
      const current = line[character];
      const next = line[character + 1];

      if (blockCommentStart) {
        const closesBlock =
          language === "plantuml"
            ? current === "'" && next === "/"
            : current === "*" && next === "/";
        if (closesBlock) {
          blockCommentStart = undefined;
          character += 1;
        }
        continue;
      }

      if (inString) {
        if (current === "\\" && next !== undefined) {
          character += 1;
        } else if (current === "\"") {
          inString = false;
        }
        continue;
      }

      if (current === "\"") {
        inString = true;
        quoteStart = character;
        continue;
      }

      if (
        language === "plantuml" &&
        current === "/" &&
        next === "'"
      ) {
        blockCommentStart = { line: lineIndex, character };
        character += 1;
        continue;
      }
      if (
        language === "structurizr" &&
        current === "/" &&
        next === "*"
      ) {
        blockCommentStart = { line: lineIndex, character };
        character += 1;
        continue;
      }
      if (
        language === "plantuml" &&
        current === "'" &&
        (character === 0 || /\s/.test(line[character - 1]))
      ) {
        break;
      }
      if (
        language === "structurizr" &&
        current === "/" &&
        next === "/"
      ) {
        break;
      }

      if (current === "{" || current === "[" || current === "(") {
        stack.push({ opening: current, line: lineIndex, character });
      } else if (current === "}" || current === "]" || current === ")") {
        const opening = stack.pop();
        if (!opening || !matchesPair(opening.opening, current)) {
          issues.push({
            message: `Le caractère « ${current} » n'a pas de délimiteur ouvrant correspondant.`,
            severity: "error",
            startLine: lineIndex,
            startCharacter: character,
            endLine: lineIndex,
            endCharacter: character + 1
          });
        }
      }
    }

    if (inString) {
      issues.push({
        message: "La chaîne de caractères n'est pas terminée.",
        severity: "error",
        startLine: lineIndex,
        startCharacter: quoteStart,
        endLine: lineIndex,
        endCharacter: quoteStart + 1
      });
      inString = false;
    }
  });

  for (const opening of stack) {
    issues.push({
      message: `Le caractère « ${opening.opening} » n'a pas de délimiteur fermant correspondant.`,
      severity: "error",
      startLine: opening.line,
      startCharacter: opening.character,
      endLine: opening.line,
      endCharacter: opening.character + 1
    });
  }

  if (blockCommentStart) {
    issues.push({
      message: "Le commentaire de bloc n'est pas terminé.",
      severity: "error",
      startLine: blockCommentStart.line,
      startCharacter: blockCommentStart.character,
      endLine: blockCommentStart.line,
      endCharacter: blockCommentStart.character + 2
    });
  }

  return issues;
}

function matchesPair(opening: string, closing: string): boolean {
  return (
    (opening === "{" && closing === "}") ||
    (opening === "[" && closing === "]") ||
    (opening === "(" && closing === ")")
  );
}

function stripStructurizrComments(source: string): string {
  return source
    .replace(/"(?:\\.|[^"\\])*"/g, "\"\"")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function hasCode(source: string): boolean {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/'[\s\S]*?'\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*'.*$/gm, "");
  return withoutComments.split(/\r\n|\r|\n/).some((line) => {
    const trimmed = line.trim();
    return trimmed !== "" && !trimmed.startsWith("'") && !trimmed.startsWith("//");
  });
}
