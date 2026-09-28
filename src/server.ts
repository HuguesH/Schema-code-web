import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const snapCli = "/snap/code/current/usr/share/code/bin/code-tunnel";
const cli = process.env.VSCODE_CLI || (existsSync(snapCli) ? snapCli : "code");
const port = process.env.WEB_PORT || "8000";
const numericPort = Number(port);

if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
  console.error(`WEB_PORT doit être un port valide entre 1 et 65535 (reçu : ${port}).`);
  process.exit(1);
}

const workspace = process.cwd();
const serverData = resolve(workspace, ".vscode-web-data");
const server = spawn(
  cli,
  [
    "serve-web",
    "--host",
    "127.0.0.1",
    "--port",
    String(numericPort),
    "--without-connection-token",
    "--accept-server-license-terms",
    "--disable-telemetry",
    "--default-folder",
    workspace,
    "--server-data-dir",
    serverData
  ],
  { stdio: "inherit" }
);

server.on("error", (error) => {
  console.error(`Impossible de démarrer VS Code Web avec « ${cli} » : ${error.message}`);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}
