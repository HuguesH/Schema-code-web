# Instructions pour les agents

## But du projet

Ce dépôt associe un lanceur local VS Code Web, écrit en TypeScript/Node.js, et une extension PlantUML Web située dans `extensions/plantuml`. Conserver cette organisation : le lanceur sert l’IDE et son profil ; l’extension est développée, compilée et testée séparément dans le workspace npm.

## Principes retenus

- L’IDE local est le serveur officiel `code serve-web`, pas un serveur npm nommé `vscode-web`. Le lancer avec `npm start` sur le loopback uniquement ; conserver `.vscode-web-data/` comme profil local persistant.
- L’extension PlantUML doit rester compatible avec l’extension host Web. Son moteur est `@plantuml/core`, version résolue dans `package-lock.json`. Rendre les diagrammes dans une webview avec les scripts JavaScript autonomes PlantUML empaquetés localement ; ne pas envoyer leur source vers un service en ligne, ni exiger un serveur Java.
- Conserver les points d’entrée `main` et `browser` du manifeste d’extension, ainsi que `extensionKind: ["workspace"]`, qui permet le chargement par le serveur VS Code Web utilisé par ce projet.
- Les fichiers `.puml`, `.plantuml` et `.pu` sont associés à l’identifiant de langage `plantuml`. L’action de prévisualisation doit rester disponible dans l’éditeur et depuis l’explorateur, avec l’icône œil.
- La prévisualisation doit afficher les modifications du document ouvert et garder une politique CSP restrictive. Ne pas introduire de dépendance Node.js ou d’API système dans le bundle navigateur.
- `extensions/plantuml/media/plantuml/` contient les scripts autonomes copiés depuis `@plantuml/core` pendant la compilation : ne pas modifier ces copies manuellement. Modifier `scripts/copy-assets.mjs` si les ressources nécessaires changent.
- `npm run plantuml:dev` utilise `@vscode/test-web` sur `localhost:3000` et un workspace virtuel pour tester l’extension. Pour ouvrir et modifier les vrais fichiers du dépôt, utiliser `npm start` sur le port 8000.
- `.vscode-web-data/` contient des extensions installées, dont le pack français, le profil et des données de l’environnement local. Ne pas supprimer, réinitialiser, versionner ou écraser son contenu lors d’un changement de code. Le profil installé n’est pas le mécanisme de compilation de l’extension.

## Commandes de validation

Depuis la racine :

```bash
npm run typecheck
npm run build
npm run plantuml:compile
```

Pour vérifier l’extension dans un navigateur, lancer `npm run plantuml:dev`, ouvrir `http://localhost:3000`, puis tester `examples/sequence.puml` et confirmer que la prévisualisation contient un SVG.

Si une modification touche le manifeste, la distribution ou le profil installé, vérifier que le VSIX contient le bundle et les ressources PlantUML avant de l’installer dans `.vscode-web-data/extensions`. Après installation, redémarrer le serveur et vérifier l’activation depuis l’IDE principal ; en mode restreint, faire confiance au workspace. Pour le français, activer **French Language Pack > Set Display Language**, puis recharger l’interface.
