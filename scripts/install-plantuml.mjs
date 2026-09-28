import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const snapCli = "/snap/code/current/usr/share/code/bin/code";
const configuredCli = process.env.VSCODE_CLI;
const cli = configuredCli
  ? configuredCli.endsWith("code-tunnel") &&
    existsSync(configuredCli.replace(/code-tunnel$/, "code"))
    ? configuredCli.replace(/code-tunnel$/, "code")
    : configuredCli
  : existsSync(snapCli)
    ? snapCli
    : "code";
const workspace = process.cwd();
const serverData = resolve(workspace, ".vscode-web-data");
const vsix = resolve(workspace, "dist/web-ide-plantuml.vsix");

const install = spawn(
  cli,
  [
    "--install-extension",
    vsix,
    "--force",
    "--extensions-dir",
    resolve(serverData, "extensions"),
    "--user-data-dir",
    serverData
  ],
  { stdio: "inherit" }
);

install.on("error", (error) => {
  console.error(`Impossible d'installer l'extension avec « ${cli} » : ${error.message}`);
  process.exitCode = 1;
});

install.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
});
