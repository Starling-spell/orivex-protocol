import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const local = process.platform === "win32"
  ? ".venv-genlayer/Scripts/genvm-lint.exe"
  : ".venv-genlayer/bin/genvm-lint";
const command = existsSync(local) ? resolve(local) : "genvm-lint";
const result = spawnSync(command, ["check", "contracts/OrivexProofRegistry.py", "--json"], {
  stdio: "inherit",
  shell: false,
});
if (result.error) {
  console.error("Install genvm-linter first: python -m pip install genvm-linter");
  process.exit(1);
}
process.exit(result.status ?? 1);
