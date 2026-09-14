import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalProof, validateProof, validateReceipt } from '../src/proof.ts';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const save = (path, data) => writeFileSync(path, JSON.stringify(data, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n');
export const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
export async function retryRead(operation) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= 2 || !/fetch failed|timeout|429|32429|ECONNRESET/i.test(String(error))) throw error;
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 5000));
    }
  }
}
export async function evidence(url) {
  const response = await retryRead(() => fetch(url, { signal: AbortSignal.timeout(30000) }));
  if (!response.ok) throw new Error(`Evidence HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 24000) throw new Error('Evidence outside contract size bounds');
  return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), hash: digest(bytes) };
}
export async function finalized(client, hash, address, sender) {
  const receipt = await retryRead(() => client.waitForTransactionReceipt({ hash, status: 'FINALIZED', interval: 6000, retries: 80 }));
  mkdirSync('artifacts/genlayer/verified', { recursive: true });
  save(resolve('artifacts/genlayer/verified', `${hash}.json`), receipt);
  validateReceipt(receipt, address, sender);
  return receipt;
}
export async function checkProof(client, manifest, id, verifyTx) {
  const receipt = await finalized(client, verifyTx, manifest.address, manifest.deployer);
  const proof = JSON.parse(await retryRead(() => client.readContract({ address: manifest.address, functionName: 'get_proof', args: [id], stateStatus: 'finalized' })));
  validateProof(proof, manifest.address, id);
  if (proof.submitter.toLowerCase() !== manifest.deployer.toLowerCase() || digest(canonicalProof(proof)) !== proof.proof_hash) throw new Error('Proof commitment mismatch');
  const call = receipt.data?.calldata?.readable;
  // Studio uses its own calldata display syntax (including trailing commas).
  if (!call?.includes('"method":"verify_proof"') || !call.includes(`"args":[${id},]`)) throw new Error('Verification transaction targets a different proof');
  const fetched = await evidence(proof.evidence_url);
  if (fetched.hash !== proof.evidence_sha256) throw new Error('Evidence bytes no longer match');
  return { proof, consensus: { status: 'FINALIZED', result: receipt.result_name, votes: receipt.consensus_data.votes, leaderOnly: receipt.leader_only }, checkedAt: new Date().toISOString() };
}
export async function checkSource(client, manifest) {
  if (client.chain?.id !== 61999 || !client.chain?.isStudio) throw new Error('Use the built-in studionet network');
  const code = await retryRead(() => client.getContractCode(manifest.address));
  if (digest(code) !== digest(readFileSync('contracts/OrivexProofRegistry.py')) || digest(code) !== manifest.sourceSha256) throw new Error('Contract source mismatch');
}
