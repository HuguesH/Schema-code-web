export interface IncludeHost {
  resolve(parentUri: string, includePath: string): string;
  read(uri: string): Promise<string>;
}

type IncludeKind = "include" | "include_once" | "include_many";

const includePattern =
  /^\s*!include(_once|_many)?\s+(?:"([^"]+)"|'([^']+)'|([^\s]+?))(?:!(\d+))?\s*(?:'.*)?$/i;
const includeDirectivePattern = /^\s*!include(?:_once|_many)?\b/i;

export async function expandIncludes(
  source: string,
  sourceUri: string,
  host: IncludeHost,
  onDependency?: (uri: string) => void
): Promise<string> {
  const includedOnce = new Set<string>();
  const activeIncludes = new Set([sourceUri]);

  const expand = async (content: string, currentUri: string): Promise<string> => {
    const newline = content.match(/\r\n|\r|\n/)?.[0] ?? "\n";
    const lines = content.split(/\r\n|\r|\n/);
    const expandedLines: string[] = [];

    for (const line of lines) {
      if (/^\s*!includeurl\b/i.test(line)) {
        throw new Error("Les inclusions distantes !includeurl ne sont pas prises en charge.");
      }

      if (!includeDirectivePattern.test(line)) {
        expandedLines.push(line);
        continue;
      }

      const match = includePattern.exec(line);
      if (!match) {
        throw new Error(`Directive d'inclusion invalide : ${line.trim()}`);
      }

      const includePath = match[2] ?? match[3] ?? match[4];
      if (includePath.startsWith("<") && includePath.endsWith(">")) {
        expandedLines.push(line);
        continue;
      }
      if (includePath.startsWith("<") || includePath.endsWith(">")) {
        throw new Error(`Chemin d'inclusion invalide : « ${includePath} ».`);
      }

      const kind: IncludeKind =
        match[1]?.toLowerCase() === "_once"
          ? "include_once"
          : match[1]?.toLowerCase() === "_many"
            ? "include_many"
            : "include";
      const includedUri = host.resolve(currentUri, includePath);
      onDependency?.(includedUri);

      if (kind === "include_once" && includedOnce.has(includedUri)) {
        continue;
      }
      if (activeIncludes.has(includedUri)) {
        throw new Error(`Cycle détecté lors de l'inclusion de « ${includePath} ».`);
      }

      if (kind === "include_once") includedOnce.add(includedUri);
      activeIncludes.add(includedUri);
      try {
        const includedSource = await host.read(includedUri);
        const selectedSource = selectIncludedDiagram(includedSource, match[5], includePath);
        const expandedSource = await expand(selectedSource, includedUri);
        expandedLines.push(expandedSource.replace(/(?:\r\n|\r|\n)$/, ""));
      } catch (error) {
        throw new Error(
          `Impossible de résoudre l'inclusion « ${includePath} » : ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        activeIncludes.delete(includedUri);
      }
    }

    return expandedLines.join(newline);
  };

  return expand(source, sourceUri);
}

function selectIncludedDiagram(
  source: string,
  selector: string | undefined,
  includePath: string
): string {
  const lines = source.split(/\r\n|\r|\n/);
  const diagrams: string[] = [];
  let currentDiagram: string[] | undefined;

  for (const line of lines) {
    if (/^\s*@startuml\b/i.test(line)) {
      if (currentDiagram) {
        throw new Error(`Le fichier inclus « ${includePath} » contient des blocs PlantUML imbriqués.`);
      }
      currentDiagram = [];
    } else if (/^\s*@enduml\b/i.test(line) && currentDiagram) {
      diagrams.push(currentDiagram.join("\n"));
      currentDiagram = undefined;
    } else if (currentDiagram) {
      currentDiagram.push(line);
    }
  }

  if (currentDiagram) {
    throw new Error(`Le fichier inclus « ${includePath} » contient un bloc @startuml non fermé.`);
  }
  if (diagrams.length === 0) return source;

  const index = selector === undefined ? 0 : Number(selector);
  const selected = diagrams[index];
  if (selected === undefined) {
    throw new Error(
      `Le diagramme ${index} n'existe pas dans le fichier inclus « ${includePath} ».`
    );
  }
  return selected;
}
