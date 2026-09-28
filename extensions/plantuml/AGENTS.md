# Instructions pour les agents PlantUML

- Cette extension cible l’extension host de VS Code Web. Garder `browser: "./dist/extension.js"` et `extensionKind: ["workspace"]` dans le manifeste.
- Le rendu doit rester entièrement dans le navigateur avec les scripts distribués par `@plantuml/core`. Ne pas basculer vers un serveur PlantUML distant, un serveur Java ou une dépendance native.
- Toute ressource JavaScript PlantUML utilisée dans la webview doit être copiée localement par `scripts/copy-assets.mjs`, empaquetée dans le VSIX et référencée par une URI `webview.asWebviewUri`. Garder une CSP et des racines de ressources locales aussi strictes que possible.
- Le prévisualiseur reçoit un URI explicite quand il est lancé depuis l’explorateur, ou le document actif depuis l’éditeur. Préserver l’association au document et l’actualisation quand celui-ci change ; sérialiser les appels au moteur si nécessaire.
- Préserver les associations `.puml`, `.plantuml`, `.pu`, la commande `plantuml.preview` et ses contributions de menu (éditeur et explorateur). L’icône œil est une commande de menu, pas une décoration permanente de chaque ligne.
- Modifier les sources dans `src/`, le manifeste et les scripts de compilation ; ne pas éditer directement `dist/` ni les copies générées de `media/plantuml/`.
- Depuis la racine, compiler avec `npm run plantuml:compile`. Tester dans le navigateur avec `npm run plantuml:dev` ; le port 3000 sert un workspace virtuel de test. Le profil persistant sur le port 8000 est géré par le projet racine.
- Après un changement du manifeste ou des fichiers distribués, reconditionner et vérifier le VSIX. Pour le profil local, l’extension doit être installée sous `.vscode-web-data/extensions` et activée dans un workspace approuvé.
