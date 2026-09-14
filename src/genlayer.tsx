import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type { Hash } from 'genlayer-js/types';
import { canonicalProof, validateProof, validateReceipt, type Proof } from './proof';
import manifest from '../deployments/genlayer-studionet.json';
import './genlayer.css';

type Example = { id: string; name: string; capability: string; proofId: number; verifyTx: string;
  proof?: Proof; checkedAt?: string; expected?: string; consensus?: { votes: Record<string, string> } };
const client = createClient({ chain: studionet });
const explorer = 'https://explorer-studio.genlayer.com';
const address = manifest.address as `0x${string}`;
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');

function AgentLab() {
  const smoke = { id: 'smoke', name: 'Document smoke proof', capability: 'Deployment verification', proofId: 1,
    verifyTx: manifest.smoke.verifyTx, proof: manifest.smoke.proof as Proof, checkedAt: manifest.checkedAt };
  const [examples, setExamples] = useState<Example[]>([smoke]);
  const [selected, setSelected] = useState('smoke');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('Saved receipt. Recheck to read StudioNet now.');
  const [error, setError] = useState('');
  const entry = examples.find(example => example.id === selected) ?? examples[0];
  const proof = entry.proof;
  useEffect(() => { void loadExamples(); }, []);
  async function loadExamples() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/genlayer-examples.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Example receipts are not available yet. Run npm run genlayer:examples, then npm run genlayer:publish.');
      const report = await response.json();
      if (report.address !== manifest.address || report.chainId !== 61999 || !Array.isArray(report.examples)) throw new Error('Example deployment does not match this build.');
      const records = report.examples.filter((item: Example) => item.proof && item.verifyTx);
      for (const item of records) {
        validateProof(item.proof, manifest.address, item.proofId);
        if (await hash(canonicalProof(item.proof)) !== item.proof.proof_hash) throw new Error('Saved proof hash mismatch.');
      }
      setExamples([smoke, ...records]);
      setMessage(`${records.length} agent example receipts loaded. Select one, then recheck onchain.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load examples.'); }
    finally { setLoading(false); }
  }
  async function recheck() {
    setChecking(true); setError(''); setMessage('Reading finalized state and consensus receipt…');
    try {
      const source = await client.getContractCode(address);
      if (await hash(typeof source === 'string' ? source : new TextDecoder().decode(source)) !== manifest.sourceSha256) throw new Error('The onchain source differs from this deployment.');
      const receipt = await client.getTransaction({ hash: entry.verifyTx as Hash });
      validateReceipt(receipt, manifest.address, manifest.deployer);
      const raw = await client.readContract({ address, functionName: 'get_proof', args: [entry.proofId] });
      const live: Proof = JSON.parse(String(raw));
      validateProof(live, manifest.address, entry.proofId);
      const call = (receipt.data as { calldata?: { readable?: string } })?.calldata?.readable;
      if (!call?.includes('"method":"verify_proof"') || !call.includes(`"args":[${entry.proofId},]`)) throw new Error('Receipt refers to a different proof.');
      if (live.submitter.toLowerCase() !== manifest.deployer.toLowerCase() || await hash(canonicalProof(live)) !== live.proof_hash) throw new Error('Proof commitment or submitter mismatch.');
      setExamples(items => items.map(item => item.id === entry.id ? { ...item, proof: live, checkedAt: new Date().toISOString(), consensus: { votes: receipt.consensus_data!.votes! } } : item));
      setMessage('Live check passed: source, finalized consensus, submitter and proof commitment match. Evidence bytes can be rechecked with npm run genlayer:check.');
    } catch (cause) { setError(cause instanceof Error && /differs|mismatch|invalid|Receipt|receipt/.test(cause.message) ? cause.message : 'StudioNet could not be checked. Saved receipt remains visible; retry or run npm run genlayer:check.'); setMessage('Live verification incomplete.'); }
    finally { setChecking(false); }
  }
  const votes = Object.values(entry.consensus?.votes ?? {});
  return <div className="agent-lab">
    <div className="lab-heading"><div><p>GenLayer StudioNet · Chain 61999</p><h2>Inspect an agent’s claim.</h2></div><a href="/docs/guide.html">Hackathon guide ↗</a></div>
    <p>Executable research and review agents submit claims against pinned public evidence. An intelligent contract records the validator-agreed judgment.</p>
    <div className="lab-actions"><button className="btn btn-primary" disabled={loading || checking} onClick={loadExamples}>{loading ? 'Loading receipts…' : 'Load agent examples'}</button><a className="btn btn-ghost" href="https://studio.genlayer.com" target="_blank" rel="noreferrer">Open GenLayer Studio ↗</a></div>
    <div className="lab-layout"><div className="lab-list" aria-label="Agent examples">{examples.map(item => <button key={item.id} aria-pressed={entry.id === item.id} disabled={checking} onClick={() => { setSelected(item.id); setError(''); setMessage('Saved receipt. Recheck to read StudioNet now.'); }}><strong>{item.name}</strong><span>{item.capability}</span><small>{item.proof?.status ?? 'PENDING'} · #{item.proofId}</small></button>)}</div>
      <article className="lab-proof"><div className="lab-proof-title"><h3>{entry.name}</h3><span className={`proof-status status-${proof?.status.toLowerCase()}`}>{proof?.status ?? 'PENDING'}</span></div>
        {proof ? <><h4>Claim</h4><p>{proof.claim}</p><h4>Evaluation criterion</h4><p>{proof.criterion}</p><dl>
          <dt>Evidence</dt><dd><a href={proof.evidence_url} target="_blank" rel="noreferrer">Open pinned document ↗</a></dd>
          <dt>Evidence SHA-256</dt><dd><code>{proof.evidence_sha256}</code></dd>
          <dt>Proof SHA-256</dt><dd><code>{proof.proof_hash}</code></dd>
          <dt>Verification transaction</dt><dd><a href={`${explorer}/tx/${entry.verifyTx}`} target="_blank" rel="noreferrer">{entry.verifyTx}</a></dd>
          <dt>Receipt export</dt><dd><a href={`/receipts/${entry.verifyTx}.json`} target="_blank" rel="noreferrer">Open full consensus receipt JSON ↗</a></dd>
          <dt>Contract</dt><dd><a href={`${explorer}/address/${manifest.address}`} target="_blank" rel="noreferrer">{manifest.address}</a></dd>
          <dt>Submitter</dt><dd><a href={`${explorer}/address/${proof.submitter}`} target="_blank" rel="noreferrer">{proof.submitter}</a></dd>
          <dt>Consensus</dt><dd>{votes.length ? `${votes.filter(v => v === 'agree').length} agree / ${votes.length} assigned; ${votes.filter(v => v === 'idle').length} idle` : 'See transaction receipt'}</dd>
          <dt>Last checked</dt><dd>{entry.checkedAt ? new Date(entry.checkedAt).toLocaleString() : 'Not checked in this session'}</dd>
        </dl></> : <p>This example has not finalized.</p>}
        <button className="btn btn-primary" disabled={checking || loading || !proof} onClick={recheck}>{checking ? 'Checking StudioNet…' : 'Recheck onchain'}</button>
        <p className="lab-message" role="status">{message}</p>{error && <p className="lab-error" role="alert">{error}</p>}
      </article></div>
    <details><summary>Run these agents from the CLI</summary><pre><code>npm run genlayer:studio{'\n'}npx --no-install genlayer account use studio-proof-deployer{'\n'}npm run genlayer:examples{'\n'}npm run genlayer:check{'\n'}npm run genlayer:publish</code></pre><p>Examples use the same operator wallet. Agent names describe local programs, not independently authenticated identities. The judgment covers the claim and evidence only. Base certificates and reputation are separate prototypes.</p></details>
  </div>;
}

createRoot(document.getElementById('genlayer-slot')!).render(<AgentLab />);
