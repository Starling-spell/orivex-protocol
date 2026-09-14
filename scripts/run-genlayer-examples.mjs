import { existsSync, mkdirSync } from 'node:fs';
import { CalldataAddress } from 'genlayer-js/types';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { agents } from '../examples/agents.mjs';
import { checkProof, checkSource, digest, evidence, finalized, readJSON, retryRead, save } from './genlayer-evidence.mjs';

export default async function runExamples(client) {
  const reader = createClient({ chain: studionet });
  const manifest = readJSON('deployments/genlayer-studionet.json');
  await checkSource(client, manifest);
  if (client.account?.address.toLowerCase() !== manifest.deployer.toLowerCase()) throw new Error('Select studio-proof-deployer to resume these examples');
  mkdirSync('artifacts/genlayer/examples', { recursive: true });
  const path = 'deployments/genlayer-examples.json';
  const report = existsSync(path) ? readJSON(path) : { address: manifest.address, chainId: 61999, examples: [] };
  if (report.address !== manifest.address) throw new Error('Example journal belongs to a different deployment');
  for (const agent of agents) {
    const fetched = await evidence(agent.evidenceUrl);
    const claim = agent.analyze(fetched.text);
    const input = [agent.reference, claim, agent.criterion, agent.evidenceUrl, fetched.hash];
    const inputHash = digest(JSON.stringify(input));
    let entry = report.examples.find(item => item.id === agent.id);
    if (!entry) { entry = { id: agent.id, name: agent.name, capability: agent.capability, expected: agent.expected, inputHash }; report.examples.push(entry); }
    if (entry.inputHash !== inputHash) throw new Error('Agent inputs changed; use a new versioned reference');
    const persist = () => save(path, report);
    async function writeOnce(field, method, args) {
      if (entry[field]) return entry[field];
      if (entry.broadcastUncertain) throw new Error(`Uncertain ${entry.broadcastUncertain} broadcast. Inspect the account history before editing the journal.`);
      entry.broadcastUncertain = method;
      persist();
      const hash = await client.writeContract({ address: manifest.address, functionName: method, args, value: 0n, leaderOnly: false });
      entry[field] = hash;
      delete entry.broadcastUncertain;
      persist();
      console.log(`${agent.name} ${method}: ${hash}`);
      return hash;
    }
    const submitTx = await writeOnce('submitTx', 'submit_proof', input);
    await finalized(client, submitTx, manifest.address, manifest.deployer);
    const submitter = new CalldataAddress(Buffer.from(manifest.deployer.slice(2), 'hex'));
    entry.proofId = Number(await retryRead(() => reader.readContract({ address: manifest.address, functionName: 'get_proof_id', args: [submitter, agent.reference], stateStatus: 'finalized' })));
    persist();
    const verifyTx = await writeOnce('verifyTx', 'verify_proof', [entry.proofId]);
    Object.assign(entry, await checkProof(client, manifest, entry.proofId, verifyTx));
    entry.matchesExpectation = entry.proof.status === agent.expected;
    persist();
    console.log(`${agent.name}: ${entry.proof.status}; proof #${entry.proofId}; hash ${entry.proof.proof_hash}`);
  }
  console.log(`Checked ${report.examples.length} examples. Results: ${path}`);
}
