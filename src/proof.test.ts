import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { canonicalProof, validateProof, validateReceipt, type Proof } from './proof';
import manifest from '../deployments/genlayer-studionet.json';

const proof = manifest.smoke.proof as Proof;
describe('proof verification boundary', () => {
  it('reproduces the actual StudioNet proof commitment', () => {
    validateProof(proof, manifest.address, 1);
    expect(createHash('sha256').update(canonicalProof(proof)).digest('hex')).toBe(proof.proof_hash);
  });
  it('escapes Unicode exactly as the contract does', () => {
    expect(canonicalProof({ claim: 'café 😀\u007f', proof_hash: '' } as Proof)).toBe('{"claim":"caf\\u00e9 \\ud83d\\ude00\\u007f"}');
  });
  it.each([{ chain_id: 1 }, { proof_id: 2 }, { status: 'PENDING' }, { domain: 'other' }])('rejects a changed domain or unfinalized proof: %o', changed => {
    expect(() => validateProof({ ...proof, ...changed }, manifest.address, 1)).toThrow();
  });
  it('detects a modified claim through its commitment', () => {
    expect(createHash('sha256').update(canonicalProof({ ...proof, claim: 'modified' })).digest('hex')).not.toBe(proof.proof_hash);
  });
  it('rejects a finalized execution error and leader-only execution', () => {
    const receipt = { status: 7, result_name: 'MAJORITY_AGREE', leader_only: false, to_address: manifest.address,
      consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } };
    expect(() => validateReceipt(receipt, manifest.address)).not.toThrow();
    expect(() => validateReceipt({ ...receipt, leader_only: true }, manifest.address)).toThrow();
    expect(() => validateReceipt({ ...receipt, consensus_data: { leader_receipt: [{ execution_result: 'ERROR' }] } }, manifest.address)).toThrow();
  });
});
