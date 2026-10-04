# PlantUML pour VS Code Web

Extension VS Code Web pour les diagrammes PlantUML et les modèles Structurizr DSL. Elle reconnaît les fichiers `.puml`, `.plantuml`, `.pu` et `.iuml`, ainsi que les fichiers `.dsl` et `.structurizr`. Les deux langages bénéficient de la coloration syntaxique, de complétions et de diagnostics structurels dans l'éditeur. PlantUML utilise en plus le moteur JavaScript officiel `@plantuml/core` pour rendre les diagrammes localement dans une vue navigateur, sans serveur Java ni requête vers un serveur PlantUML.

Ouvrez la prévisualisation avec l'icône en forme d'œil dans la barre de titre de l'éditeur ou via **clic droit sur un fichier PlantUML > PlantUML: Prévisualiser le diagramme** dans l'explorateur. La prévisualisation suit les modifications du document ouvert.

La barre d'outils de la prévisualisation permet de zoomer, de réinitialiser le zoom et d'exporter le diagramme rendu au format SVG.

Les directives `!include`, `!include_once` et `!include_many` sont développées en cascade depuis le système de fichiers du workspace, avec `vscode.workspace.fs`. Les chemins sont relatifs au fichier qui contient la directive ; les fichiers inclus sont surveillés et la prévisualisation est actualisée lorsqu'ils changent. Pour un fichier contenant plusieurs diagrammes, le suffixe `!0`, `!1`, etc. sélectionne le diagramme à inclure ; le bloc sélectionné est inséré sans ses marqueurs `@startuml`/`@enduml`. Les chemins qui sortent du workspace et les inclusions distantes `!includeurl` sont refusés. Les inclusions standards entre chevrons recherchent d'abord un fichier local à la racine du workspace (extension explicite ou `.puml`, `.plantuml`, `.pu`, `.iuml`), puis sont traitées par le moteur. Tous les bundles de bibliothèques standards publiés pour le moteur PlantUML JavaScript sont empaquetés localement, sans accès réseau à l'exécution. La liste, les sources et les licences sont détaillées dans `media/plantuml/THIRD-PARTY-NOTICES.md`.

Les bundles de bibliothèques standards sont des ressources tierces copiées sans modification depuis la distribution PlantUML JavaScript ; leurs licences et attributions sont conservées dans `media/plantuml/licenses/`.

La commande `listsprites` affiche dans la prévisualisation une planche SVG des sprites SVG définis dans le diagramme et ses includes, au lieu de transmettre cette commande ignorée par le moteur JavaScript à son analyseur de diagrammes.

Les diagnostics détectent notamment les marqueurs PlantUML manquants ou mal appariés, les chaînes et délimiteurs non terminés, ainsi que les chaînes et accolades incorrectes dans le DSL Structurizr. La complétion propose les constructions courantes des deux langages ; elle ne remplace pas une validation complète par le moteur PlantUML ou le parseur Structurizr.

## Développement

Depuis la racine du dépôt :

```bash
npm install
npm run plantuml:install
```

Cette commande compile et empaquette le VSIX, puis installe la nouvelle version dans le profil local `.vscode-web-data` utilisé sur le port 8000. Rechargez la fenêtre VS Code Web après l'installation. Pour utiliser un exécutable VS Code qui n'est pas trouvé automatiquement, définissez `VSCODE_CLI`.

Pour travailler sans modifier le profil de l'IDE principal, lancez `npm run plantuml:dev`. Le serveur de test de `@vscode/test-web` démarre sur <http://localhost:3000> avec l'extension de développement et des exemples dans un espace virtuel.

Le code de l'extension se trouve dans `src/extension.ts`. Un diagramme d'exemple est disponible dans `examples/sequence.puml`. `npm run compile` copie les fichiers JavaScript autonomes officiels (`plantuml.js`, `viz-global.js`, `themes.js`, `emoji.js` et `openiconic.js`) dans `media/plantuml/`, puis génère le bundle de l'extension dans `dist/`. Ces fichiers générés ne sont pas versionnés et sont recréés à partir de la version verrouillée dans `package-lock.json`.

Les tests Playwright de `e2e/language-support.spec.ts` couvrent les deux langages dans le workbench Monaco. Depuis la racine, installez Chromium avec `npx playwright install chromium`, puis lancez `npm run test:e2e`.
