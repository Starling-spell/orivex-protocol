import { spawn } from 'node:child_process';
// The official CLI owns signing and account selection. No key is handled here.
const child = spawn(process.execPath, ['node_modules/genlayer/dist/index.js', 'deploy'], {
  stdio: 'inherit', env: { ...process.env, ORIVEX_EXAMPLES_ONLY: '1' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
