import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (path, value) => writeFileSync(path, JSON.stringify(value, (_, v) => typeof v === 'bigint' ? String(v) : v, 2) + '\n');
export default async function deploy(client) {
  if (Number(await client.getChainId()) !== 61997) throw new Error('Select studio-dev (61997).');
  const directory = 'artifacts/genlayer-next';
  mkdirSync(directory, { recursive: true });
  const source = readFileSync('contracts/OrivexProofRegistry.py');
  const sourceSha256 = hash(source);
  const journalFile = `${directory}/journal.json`;
  const journal = existsSync(journalFile) ? JSON.parse(readFileSync(journalFile, 'utf8')) : { chainId: 61997, sourceSha256 };
  if (journal.chainId !== 61997 || journal.sourceSha256 !== sourceSha256) throw new Error('Saved transaction belongs to different source or chain.');
  const fees = async () => {
    const q = await client.estimateTransactionFees({ leaderTimeunitsAllocation: 100n, validatorTimeunitsAllocation: 200n, rotations: [3n], appealRounds: 0n, totalMessageFees: 0n });
    return { distribution: q.distribution, feeValue: q.feeValue };
  };
  async function step(name, submit) {
    if (!journal[name]) { journal[name] = await submit(); save(journalFile, journal); console.log(name, journal[name]); }
    const cached = `${directory}/${journal[name]}.json`;
    let receipt;
    if (existsSync(cached)) receipt = JSON.parse(readFileSync(cached,'utf8'));
    else { receipt = await client.waitForTransactionReceipt({ hash: journal[name], waitUntil: 'finalized', fullTransaction: true, retries: 180, interval: 5000 }); save(cached, receipt); }
    if (receipt.statusName !== 'FINALIZED' || receipt.txExecutionResultName !== 'FINISHED_WITH_RETURN') throw new Error(`${name} execution failed; inspect ${cached}`);
    return receipt;
  }
  const deployed = await step('deploymentTx', async () => client.deployContract({ code: new Uint8Array(source), args: [], fees: await fees() }));
  const address = deployed.data?.contract_address ?? deployed.txDataDecoded?.contractAddress;
  if (!/^0x[0-9a-f]{40}$/i.test(address ?? '')) throw new Error('No deployment address');
  const code = await client.getContractCode(address);
  if (hash(code) !== sourceSha256) throw new Error('Onchain source mismatch');
  const previous = JSON.parse(readFileSync('deployments/genlayer-studionet.json','utf8'));
  const example = previous.smoke.proof;
  const response = await fetch(example.evidence_url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Evidence fetch failed');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== example.evidence_sha256) throw new Error('Pinned evidence mismatch');
  const reference = 'orivex:studio-next:license-review:v1';
  const submitted = await step('submitTx', async () => client.writeContract({ address, functionName:'submit_proof', args:[reference, example.claim, example.criterion, example.evidence_url, example.evidence_sha256], value:0n, fees:await fees() }));
  const sender = submitted.from_address ?? deployed.from_address;
  const id = Number(await client.readContract({ address, functionName:'get_proof_id', args:[sender, reference] }));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('No proof ID');
  const verified = await step('verifyTx', async () => client.writeContract({ address, functionName:'verify_proof', args:[id], value:0n, fees:await fees() }));
  const proof = JSON.parse(String(await client.readContract({ address, functionName:'get_proof', args:[id] })));
  const { proof_hash, ...fields } = proof;
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(fields).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0))).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
  if (proof.chain_id !== 61997 || proof.status !== 'SUCCESS' || hash(canonical) !== proof_hash) throw new Error('Judgment or proof commitment verification failed');
  const manifest = { network:'studio-dev', chainId:61997, rpc:'https://studio-dev.genlayer.com/api', explorer:'https://explorer-studio-dev.genlayer.com', contract:'OrivexProofRegistry', address, deployer:sender, deploymentTx:journal.deploymentTx, status:'FINALIZED', execution:'FINISHED_WITH_RETURN', sourceSha256, sourceMatchesCurrent:true, usableForProofs:true, checkedAt:new Date().toISOString(), smoke:{status:proof.status,submitTx:journal.submitTx,verifyTx:journal.verifyTx,proof,consensus:{votes:verified.consensus_data?.votes ?? {}}} };
  save('deployments/genlayer-studio-next.json',manifest);
  save('public/genlayer-studio-next.json',manifest);
  const report = {chainId:61997,address,examples:[]};
  save('deployments/genlayer-next-examples.json',report);save('public/genlayer-next-examples.json',report);
  mkdirSync('public/receipts',{recursive:true});
  for (const tx of [journal.deploymentTx,journal.submitTx,journal.verifyTx]) writeFileSync(`public/receipts/${tx}.json`,readFileSync(`${directory}/${tx}.json`));
  console.log(JSON.stringify({address, chainId:61997, status:proof.status, proofHash:proof_hash, journal},null,2));
}
