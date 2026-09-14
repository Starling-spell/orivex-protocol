import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { existsSync } from 'node:fs';
import { checkProof, checkSource, finalized, readJSON, save } from './genlayer-evidence.mjs';

const client = createClient({ chain: studionet });
const path = 'deployments/genlayer-studionet.json';
const manifest = readJSON(path);
await checkSource(client, manifest);
await finalized(client, manifest.deploymentTx, manifest.address, manifest.deployer);
await finalized(client, manifest.smoke.submitTx, manifest.address, manifest.deployer);
Object.assign(manifest.smoke, await checkProof(client, manifest, 1, manifest.smoke.verifyTx));
manifest.smoke.status = manifest.smoke.proof.status;
manifest.usableForProofs = manifest.smoke.status === 'SUCCESS';
manifest.checkedAt = new Date().toISOString();
save(path, manifest);
console.log(`Source and smoke proof commitment verified: ${manifest.address}`);
if (existsSync('deployments/genlayer-examples.json')) {
  const report = readJSON('deployments/genlayer-examples.json');
  for (const entry of report.examples) {
    if (!entry.verifyTx) throw new Error(`Unfinished example: ${entry.id}`);
    Object.assign(entry, await checkProof(client, manifest, entry.proofId, entry.verifyTx));
    console.log(`${entry.name}: ${entry.proof.status}`);
  }
  save('deployments/genlayer-examples.json', report);
}
