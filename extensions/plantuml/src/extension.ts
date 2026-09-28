import * as vscode from "vscode";
import {
  getCompletions,
  validateLanguage,
  type DiagramLanguage
} from "./languageSupport";

interface PreviewMessage {
  type: "ready";
}

interface Preview {
  panel: vscode.WebviewPanel;
  document: vscode.TextDocument;
  ready: boolean;
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
      const preview = previews.get(document.uri.toString());
      if (preview?.ready) {
        void preview.panel.webview.postMessage({
          type: "render",
          source: document.getText()
        });
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
  const preview: Preview = { panel, document, ready: false };
  previews.set(key, preview);

  panel.webview.onDidReceiveMessage((message: PreviewMessage) => {
    if (message?.type === "ready") {
      preview.ready = true;
      void panel.webview.postMessage({
        type: "render",
        source: document.getText()
      });
    }
  });
  panel.webview.html = createWebviewHtml(context, panel.webview);

  panel.onDidDispose(() => {
    previews.delete(key);
  });
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
    body { padding: 1rem; color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
    #status { color: var(--vscode-descriptionForeground); white-space: pre-wrap; }
    #output { overflow: auto; }
    #output svg { display: block; max-width: 100%; height: auto; margin: 1rem auto; }
  </style>
  <script nonce="${nonce}">window.PLANTUML_STDLIB_BASE = ${JSON.stringify(`${vendorUri}/`)};</script>
  <script nonce="${nonce}" src="${vizUri}"></script>
</head>
<body>
  <p id="status" role="status">Chargement du moteur PlantUML…</p>
  <main id="output"></main>
  <script type="module" nonce="${nonce}">
    import { renderToString } from ${JSON.stringify(rendererUri)};
    const vscode = acquireVsCodeApi();
    const status = document.getElementById("status");
    const output = document.getElementById("output");
    let latestVersion = 0;
    let queue = Promise.resolve();

    function render(source, version) {
      return new Promise((resolve, reject) => {
        renderToString(
          source.split(/\\r\\n|\\r|\\n/),
          resolve,
          (error) => reject(new Error(String(error)))
        );
      }).then((svg) => {
        if (version !== latestVersion) return;
        output.innerHTML = svg;
        status.textContent = "";
      }).catch((error) => {
        if (version !== latestVersion) return;
        output.replaceChildren();
        status.textContent = "Erreur PlantUML : " + String(error);
      });
    }

    window.addEventListener("message", (event) => {
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
