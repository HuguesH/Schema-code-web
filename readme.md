# Web-IDE

![Logo C4, UML et Structurizr](assets/c4-uml-stru.svg)

Environnement local de développement avec VS Code pour le Web, piloté par Node.js, npm et TypeScript. Le serveur ouvre le dossier du projet sur le système de fichiers local : les modifications sont enregistrées normalement.

## Prérequis

- Node.js 20 ou ultérieur et npm
- Visual Studio Code installé avec la prise en charge de `code serve-web`

## Démarrage

```bash
npm install
npm start
```

Ouvrez ensuite <http://localhost:8000> dans votre navigateur. Le serveur est lié à `127.0.0.1` et ne répond donc qu'en local. Les données du serveur (extensions et paramètres) sont conservées dans `.vscode-web-data/`.

Pour choisir un autre port :

```bash
WEB_PORT=8080 npm start
```

Si la commande VS Code n'est pas nommée `code` ou n'est pas dans le `PATH`, indiquez son chemin. Avec le paquet Snap officiel sur Linux, le chemin habituel est `/snap/code/current/usr/share/code/bin/code-tunnel` :

```bash
VSCODE_CLI=/chemin/vers/code npm start
```

## Développement TypeScript

- `npm run dev` : lance le serveur en mode watch
- `npm run build` : compile les fichiers TypeScript dans `dist/`
- `npm run typecheck` : vérifie les types sans générer de fichiers

> Le serveur Web provient de l'interface en ligne de commande de VS Code (`code serve-web`), pas d'un package npm nommé `vscode-web`.

## Extension PlantUML

Le projet contient une extension VS Code Web dans `extensions/plantuml`. Elle fournit coloration syntaxique, complétion, diagnostics et prévisualisation PlantUML pour `.puml`, `.plantuml`, `.pu` et `.iuml`, ainsi que coloration, complétion et diagnostics Structurizr DSL pour `.dsl` et `.structurizr`. Après une modification de l'extension, exécutez `npm run plantuml:install` puis rechargez la fenêtre VS Code Web sur <http://localhost:8000> pour appliquer le nouveau VSIX au profil local. Pour compiler sans installer, lancez `npm run plantuml:compile`. Pour tester l'extension de développement dans un navigateur, utilisez `npm run plantuml:dev` puis ouvrez <http://localhost:3000>.

### Tests Playwright

Les tests de bout en bout enregistrés dans `extensions/plantuml/e2e/language-support.spec.ts` ouvrent les exemples dans VS Code Web et vérifient la coloration, la complétion et les diagnostics des deux langages. Installez le navigateur géré par Playwright une fois, puis lancez les tests depuis la racine :

```bash
npx playwright install chromium
npm run test:e2e
```

Ils démarrent automatiquement le serveur de test VS Code Web sur le port 3000. Pour tester le profil installé du serveur principal, démarrez `npm start`, puis lancez `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8000 npm run test:e2e`. Pour utiliser un Chromium déjà installé, définissez `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` avec le chemin de son exécutable. Les résultats Playwright sont écrits dans `test-results/` et `playwright-report/`, ignorés par Git.

Le profil `.vscode-web-data/` contient aussi l'extension installée `web-ide.struc4uml` et le pack français. Pour choisir le français dans l'interface, ouvrez **Extensions**, sélectionnez **French Language Pack**, cliquez sur **Set Display Language**, puis rechargez la page. Si VS Code affiche **Restricted Mode**, faites confiance au dossier du projet pour activer l'extension.
