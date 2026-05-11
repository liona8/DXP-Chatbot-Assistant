import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(appDir, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  cwd: appDir,
  env: {
    ...process.env,
    NODE_PATH: path.join(appDir, "node_modules"),
  },
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
