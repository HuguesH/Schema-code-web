import * as vscode from "vscode";
import {
  getCompletions,
  validateLanguage,
  type DiagramLanguage
} from "./languageSupport";
import { expandIncludes } from "./includeResolver";
import { createSpriteListSvg } from "./spriteList";

type PreviewMessage =
  | { type: "ready" }
  | { type: "exportSvg"; svg: string };

interface Preview {
  panel: vscode.WebviewPanel;
  document: vscode.TextDocument;
  ready: boolean;
  renderVersion: number;
  dependencies: Set<string>;
  includeWatchers: Map<string, vscode.Disposable>;
}

const previews = new Map<string, Preview>();

export function activate(context: vscode.ExtensionContext): void {
  registerLanguageSupport(context);
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "plantuml.preview",
      async (resource?: vscode.Uri) => {
        try {
          const document = resource
            ? await vscode.workspace.openTextDocument(resource)
            : vscode.window.activeTextEditor?.document;

          if (!document || document.languageId !== "plantuml") {
            void vscode.window.showErrorMessage(
              "Ouvrez ou sélectionnez un fichier PlantUML (.puml, .plantuml ou .pu)."
            );
            return;
          }

          showPreview(context, document);
        } catch (error) {
          void vscode.window.showErrorMessage(
            `Impossible d'ouvrir la prévisualisation PlantUML : ${errorMessage(error)}`
          );
        }
      }
    ),
    vscode.workspace.onDidChangeTextDocument(({ document }) => {
      const changedUri = document.uri.toString();
      for (const preview of previews.values()) {
        if (
          preview.ready &&
          (preview.document.uri.toString() === changedUri ||
            preview.dependencies.has(changedUri))
        ) {
          void updatePreview(preview, preview.document.getText());
        }
      }
    })
  );
}

function registerLanguageSupport(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("diagram-dsl");
  context.subscriptions.push(diagnostics);

  const updateDiagnostics = (document: vscode.TextDocument): void => {
    if (document.languageId !== "plantuml" && document.languageId !== "structurizr") {
      return;
    }

    const language = document.languageId as DiagramLanguage;
    diagnostics.set(
      document.uri,
      validateLanguage(language, document.getText()).map((issue) => {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            issue.startLine,
            issue.startCharacter,
            issue.endLine,
            issue.endCharacter
          ),
          issue.message,
          issue.severity === "error"
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = language === "plantuml" ? "PlantUML" : "Structurizr DSL";
        return diagnostic;
      })
    );
  };

  const registerCompletions = (language: DiagramLanguage): vscode.Disposable =>
    vscode.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (document, position) =>
        getCompletions(language).map((completion) => {
          const item = new vscode.CompletionItem(
            completion.label,
            completion.snippet
              ? vscode.CompletionItemKind.Snippet
              : vscode.CompletionItemKind.Keyword
          );
          item.detail = completion.detail;
          item.insertText = completion.snippet
            ? new vscode.SnippetString(completion.insertText)
            : completion.insertText;
          if (language === "plantuml") {
            const prefix = document
              .lineAt(position.line)
              .text.slice(0, position.character)
              .match(/@[\w]*$/)?.[0];
            if (prefix) {
              item.range = new vscode.Range(
                position.line,
                position.character - prefix.length,
                position.line,
                position.character
              );
              item.filterText = completion.label.replace(/^@/, "");
            }
          }
          return item;
        })
    }, ...(language === "plantuml" ? ["@", "!"] : []));

  context.subscriptions.push(
    registerCompletions("plantuml"),
    registerCompletions("structurizr"),
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
    vscode.workspace.onDidChangeTextDocument(({ document }) => updateDiagnostics(document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri))
  );

  vscode.workspace.textDocuments.forEach(updateDiagnostics);
}

export function deactivate(): void {
  for (const preview of previews.values()) {
    preview.renderVersion += 1;
    preview.ready = false;
    for (const watcher of preview.includeWatchers.values()) watcher.dispose();
  }
  previews.clear();
}

function showPreview(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument
): void {
  const key = document.uri.toString();
  const existing = previews.get(key);
  if (existing) {
    existing.panel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "plantuml.preview",
    `PlantUML: ${document.uri.path.split("/").pop() ?? "diagramme"}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media", "plantuml")]
    }
  );
  const preview: Preview = {
    panel,
    document,
    ready: false,
    renderVersion: 0,
    dependencies: new Set(),
    includeWatchers: new Map()
  };
  previews.set(key, preview);

  panel.webview.onDidReceiveMessage(async (message: PreviewMessage) => {
    if (message?.type === "ready") {
      preview.ready = true;
      void updatePreview(preview, document.getText());
    } else if (
      message?.type === "exportSvg" &&
      typeof message.svg === "string" &&
      message.svg.length > 0
    ) {
      await exportSvg(document, message.svg);
    }
  });
  panel.webview.html = createWebviewHtml(context, panel.webview);

  panel.onDidDispose(() => {
    preview.ready = false;
    preview.renderVersion += 1;
    for (const watcher of preview.includeWatchers.values()) watcher.dispose();
    preview.includeWatchers.clear();
    previews.delete(key);
  });
}

async function updatePreview(preview: Preview, source: string): Promise<void> {
  const version = ++preview.renderVersion;
  const dependencies = new Set<string>();
  const host = {
    resolve: (parentUri: string, includePath: string): string =>
      resolveWorkspaceInclude(parentUri, includePath),
    read: async (uri: string): Promise<string> => {
      const content = await vscode.workspace.fs.readFile(vscode.Uri.parse(uri));
      return new TextDecoder().decode(content);
    }
  };

  try {
    const expandedSource = await expandIncludes(
      source,
      preview.document.uri.toString(),
      host,
      (uri) => dependencies.add(uri)
    );
    if (version !== preview.renderVersion) return;
    preview.dependencies = dependencies;
    updateIncludeWatchers(preview, dependencies);
    const spriteListSvg = createSpriteListSvg(expandedSource);
    if (spriteListSvg) {
      void preview.panel.webview.postMessage({
        type: "renderSvg",
        svg: spriteListSvg
      });
      return;
    }
    void preview.panel.webview.postMessage({
      type: "render",
      source: expandedSource
    });
  } catch (error) {
    if (version !== preview.renderVersion) return;
    preview.dependencies = dependencies;
    updateIncludeWatchers(preview, dependencies);
    void preview.panel.webview.postMessage({
      type: "renderError",
      error: errorMessage(error)
    });
  }
}

function resolveWorkspaceInclude(parentUri: string, includePath: string): string {
  if (
    !includePath ||
    includePath.startsWith("/") ||
    /^[a-z][a-z\d+.-]*:/i.test(includePath)
  ) {
    throw new Error(`Le chemin d'inclusion doit être relatif : « ${includePath} ».`);
  }

  const parent = vscode.Uri.parse(parentUri);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(parent);
  if (!workspaceFolder) {
    throw new Error("Les inclusions locales nécessitent un fichier dans le workspace.");
  }

  const directory = parent.with({
    path: parent.path.slice(0, parent.path.lastIndexOf("/") + 1)
  });
  const included = vscode.Uri.joinPath(directory, ...includePath.split(/[\\/]/));
  if (!vscode.workspace.getWorkspaceFolder(included)) {
    throw new Error("Le chemin d'inclusion sort du dossier du workspace.");
  }
  return included.toString();
}

function updateIncludeWatchers(
  preview: Preview,
  dependencies: Set<string>
): void {
  for (const [uri, watcher] of preview.includeWatchers) {
    if (!dependencies.has(uri)) {
      watcher.dispose();
      preview.includeWatchers.delete(uri);
    }
  }

  for (const uri of dependencies) {
    if (preview.includeWatchers.has(uri)) continue;
    const includeUri = vscode.Uri.parse(uri);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(includeUri);
    if (!workspaceFolder) continue;

    const rootPath = workspaceFolder.uri.path.replace(/\/+$/, "");
    const relativePath = includeUri.path.slice(rootPath.length + 1);
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceFolder, relativePath)
    );
    const refresh = (): void => {
      if (preview.ready) void updatePreview(preview, preview.document.getText());
    };
    preview.includeWatchers.set(
      uri,
      vscode.Disposable.from(
        watcher,
        watcher.onDidChange(refresh),
        watcher.onDidCreate(refresh),
        watcher.onDidDelete(refresh)
      )
    );
  }
}

async function exportSvg(document: vscode.TextDocument, svg: string): Promise<void> {
  const stem = document.uri.path.split("/").pop()?.replace(/\.[^.]+$/, "") || "diagramme";
  const filename = `${stem}.svg`;
  const lastSlash = document.uri.path.lastIndexOf("/");
  const defaultUri = document.uri.scheme === "file"
    ? document.uri.with({
        path: `${document.uri.path.slice(0, lastSlash + 1)}${filename}`
      })
    : undefined;

  try {
    const target = await vscode.window.showSaveDialog({
      defaultUri,
      saveLabel: "Exporter",
      filters: { SVG: ["svg"] }
    });
    if (!target) return;

    await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(svg));
    void vscode.window.showInformationMessage("Diagramme exporté au format SVG.");
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Impossible d'exporter le diagramme SVG : ${errorMessage(error)}`
    );
  }
}

function createWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview
): string {
  const nonce = getNonce();
  const vendorDirectory = vscode.Uri.joinPath(
    context.extensionUri,
    "media",
    "plantuml"
  );
  const vendorUri = webview.asWebviewUri(vendorDirectory).toString();
  const rendererUri = webview
    .asWebviewUri(vscode.Uri.joinPath(vendorDirectory, "plantuml.js"))
    .toString();
  const vizUri = webview
    .asWebviewUri(vscode.Uri.joinPath(vendorDirectory, "viz-global.js"))
    .toString();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource};">
  <title>Prévisualisation PlantUML</title>
  <style>
    body { box-sizing: border-box; display: flex; flex-direction: column; height: 100vh; margin: 0; padding: 1rem; color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
    #toolbar { display: flex; align-items: center; gap: 0.4rem; padding-bottom: 0.75rem; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; border-radius: 2px; padding: 0.35rem 0.6rem; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.5; cursor: default; }
    #zoom-level { min-width: 3.5rem; color: var(--vscode-descriptionForeground); text-align: center; }
    #status { color: var(--vscode-descriptionForeground); white-space: pre-wrap; }
    #output { flex: 1; min-height: 0; overflow: auto; }
    #diagram { width: max-content; min-width: 100%; }
    #diagram svg { display: block; max-width: none; height: auto; margin: 1rem auto; }
  </style>
  <script nonce="${nonce}">window.PLANTUML_STDLIB_BASE = ${JSON.stringify(`${vendorUri}/`)};</script>
  <script nonce="${nonce}" src="${vizUri}"></script>
</head>
<body>
  <nav id="toolbar" aria-label="Outils de prévisualisation">
    <button id="zoom-out" type="button" title="Zoom arrière" aria-label="Zoom arrière">−</button>
    <span id="zoom-level" aria-live="polite">100 %</span>
    <button id="zoom-in" type="button" title="Zoom avant" aria-label="Zoom avant">+</button>
    <button id="zoom-reset" type="button" title="Réinitialiser le zoom">Réinitialiser</button>
    <button id="export-svg" type="button" title="Exporter le diagramme au format SVG" disabled>Exporter en SVG</button>
  </nav>
  <p id="status" role="status">Chargement du moteur PlantUML…</p>
  <main id="output"><div id="diagram"></div></main>
  <script type="module" nonce="${nonce}">
    import { renderToString } from ${JSON.stringify(rendererUri)};
    const vscode = acquireVsCodeApi();
    const status = document.getElementById("status");
    const diagram = document.getElementById("diagram");
    const zoomLevel = document.getElementById("zoom-level");
    const exportButton = document.getElementById("export-svg");
    let zoom = 1;
    let latestVersion = 0;
    let queue = Promise.resolve();

    function updateZoom(nextZoom) {
      zoom = Math.min(3, Math.max(0.2, nextZoom));
      diagram.style.zoom = String(zoom);
      zoomLevel.textContent = Math.round(zoom * 100) + " %";
    }

    document.getElementById("zoom-in").addEventListener("click", () => updateZoom(zoom + 0.2));
    document.getElementById("zoom-out").addEventListener("click", () => updateZoom(zoom - 0.2));
    document.getElementById("zoom-reset").addEventListener("click", () => updateZoom(1));
    exportButton.addEventListener("click", () => {
      const svg = diagram.querySelector("svg");
      if (!svg) return;
      const copy = svg.cloneNode(true);
      if (!copy.hasAttribute("xmlns")) {
        copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      vscode.postMessage({
        type: "exportSvg",
        svg: new XMLSerializer().serializeToString(copy)
      });
    });

    function render(source, version) {
      return new Promise((resolve, reject) => {
        renderToString(
          source.split(/\\r\\n|\\r|\\n/),
          resolve,
          (error) => reject(new Error(String(error)))
        );
      }).then((svg) => {
        if (version !== latestVersion) return;
        diagram.innerHTML = svg;
        exportButton.disabled = !diagram.querySelector("svg");
        status.textContent = "";
      }).catch((error) => {
        if (version !== latestVersion) return;
        diagram.replaceChildren();
        exportButton.disabled = true;
        status.textContent = "Erreur PlantUML : " + String(error);
      });
    }

    function displaySvg(svg) {
      diagram.innerHTML = svg;
      exportButton.disabled = !diagram.querySelector("svg");
      status.textContent = "";
    }

    window.addEventListener("message", (event) => {
      if (event.data?.type === "renderError" && typeof event.data.error === "string") {
        latestVersion += 1;
        diagram.replaceChildren();
        exportButton.disabled = true;
        status.textContent = "Erreur d'inclusion PlantUML : " + event.data.error;
        return;
      }
      if (event.data?.type === "renderSvg" && typeof event.data.svg === "string") {
        latestVersion += 1;
        displaySvg(event.data.svg);
        return;
      }
      if (event.data?.type !== "render" || typeof event.data.source !== "string") return;
      const version = ++latestVersion;
      const source = event.data.source;
      status.textContent = "Génération du diagramme…";
      queue = queue.then(() => render(source, version));
    });

    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
}

function getNonce(): string {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
