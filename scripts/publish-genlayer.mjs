import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { readJSON } from './genlayer-evidence.mjs';
const report = readJSON('deployments/genlayer-examples.json');
if (report.examples.length !== 5 || report.examples.some(entry => !entry.proof || !entry.checkedAt)) throw new Error('Run and check all five examples first');
mkdirSync('public', { recursive: true });
copyFileSync('deployments/genlayer-examples.json', 'public/genlayer-examples.json');
copyFileSync('deployments/genlayer-studionet.json', 'public/genlayer-studionet.json');
mkdirSync('public/receipts', { recursive: true });
const manifest = readJSON('deployments/genlayer-studionet.json');
for (const tx of [manifest.deploymentTx, manifest.smoke.submitTx, manifest.smoke.verifyTx, ...report.examples.flatMap(entry => [entry.submitTx, entry.verifyTx])]) {
  const source = `artifacts/genlayer/verified/${tx}.json`;
  if (!existsSync(source)) throw new Error(`Missing receipt ${tx}`);
  copyFileSync(source, `public/receipts/${tx}.json`);
}
console.log('Published public proof records and 13 consensus receipts for the app build.');
