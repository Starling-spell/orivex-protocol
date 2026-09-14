import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const python = resolve(process.platform === "win32"
  ? ".venv-genlayer/Scripts/python.exe" : ".venv-genlayer/bin/python");
// Disable the integration plugin, which otherwise clears the Solidity artifacts.
const result = spawnSync(python, ["-m", "pytest", "-p", "gltest.direct.pytest_plugin",
  "tests/genlayer", "-v", "--tb=short"], {
  stdio: "inherit",
  env: { ...process.env, PYTEST_DISABLE_PLUGIN_AUTOLOAD: "1" },
});
if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);
const deployment = spawnSync(process.execPath, ["--test", "tests/genlayer/deploy.check.mjs"], { stdio: "inherit" });
process.exit(deployment.status ?? 1);
