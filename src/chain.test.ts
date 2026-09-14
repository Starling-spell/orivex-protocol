import { describe, expect, it } from 'vitest';
import { configuredAddress, normalizeMetadata, walletError, chain } from './chain';

describe('testnet wallet guards', () => {
  it('targets only Base Sepolia', () => { expect(chain.id).toBe(84532); expect(chain.testnet).toBe(true); });
  it('rejects zero, malformed and private-key-shaped configuration values', () => {
    expect(configuredAddress('0x' + '0'.repeat(40))).toBeUndefined();
    expect(configuredAddress('0x' + '1'.repeat(64))).toBeUndefined();
    expect(configuredAddress('not-an-address')).toBeUndefined();
  });
  it('blocks executable and insecure metadata URIs', () => {
    for (const uri of ['javascript:alert(1)', 'data:text/html,bad', 'http://example.com', 'ipfs://', '']) expect(() => normalizeMetadata(uri)).toThrow();
    expect(normalizeMetadata(' ipfs://bafytest ')).toBe('ipfs://bafytest');
    expect(normalizeMetadata('https://example.com/agent.json')).toBe('https://example.com/agent.json');
  });
  it('unwraps user rejection and funding errors without displaying RPC internals', () => {
    expect(walletError({ cause: { cause: { code: 4001 } } })).toContain('declined');
    expect(walletError({ cause: { message: 'insufficient funds for gas' } })).toContain('test ETH');
    expect(walletError({ shortMessage: '0xdeadbeef' })).not.toContain('0xdeadbeef');
  });
});
