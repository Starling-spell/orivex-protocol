import { expect, it } from 'vitest';
import { parseProofId, proofIdFromReceipt, studioError, txHash } from './studio';

it('reads the proof ID from a StudioNet submit receipt', () => {
  expect(proofIdFromReceipt({
    consensus_data: { leader_receipt: [{ mode: 'leader', result: { payload: { readable: '7' } } }] },
  })).toBe(7);
});

it('parses proof IDs from StudioNet return values', () => {
  expect(parseProofId(7)).toBe(7);
  expect(parseProofId('7')).toBe(7);
  expect(parseProofId('"7"')).toBe(7);
  expect(parseProofId(0)).toBeUndefined();
});

it('extracts a transaction hash from writeContract return values', () => {
  expect(txHash('0x' + 'ab'.repeat(32))).toMatch(/^0xab/i);
  expect(txHash({ hash: '0x' + 'cd'.repeat(32) })).toMatch(/^0xcd/i);
});

it('maps StudioNet errors without exposing RPC internals', () => {
  expect(studioError(new Error('[EXPECTED] reference already submitted'))).toContain('new reference');
  expect(studioError(new Error('User rejected the request'))).toContain('Wallet request declined');
  expect(studioError({ shortMessage: '0xdeadbeef' })).not.toContain('0xdeadbeef');
});
