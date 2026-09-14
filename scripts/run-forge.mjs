import { spawnSync } from 'node:child_process';
import { forgeBinary } from './forge-binary.mjs';
const result = spawnSync(forgeBinary, process.argv.slice(2), { stdio: 'inherit', shell: false });
if (result.error) { console.error('Could not run Foundry:', result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
