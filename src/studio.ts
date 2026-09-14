import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type { Hash } from 'genlayer-js/types';

type EthereumProvider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
type WalletHandle = { address: string; provider: EthereumProvider };

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    __orivexGetWallet?: () => Promise<WalletHandle>;
  }
}

export async function studioWalletWriter() {
  const hooked = typeof window !== 'undefined' ? window.__orivexGetWallet : undefined;
  let handle: WalletHandle | undefined;
  if (hooked) handle = await hooked();
  if (!handle) {
    const provider = typeof window !== 'undefined' ? window.ethereum : undefined;
    if (!provider?.request) throw new Error('Connect a wallet first, then click Verify.');
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
    if (!accounts?.[0]) throw new Error('Connect a wallet first, then click Verify.');
    handle = { address: accounts[0], provider };
  }
  const client = createClient({ chain: studionet, account: handle.address as `0x${string}`, provider: handle.provider });
  try { await client.connect('studionet'); } catch { /* Wallet may already be on StudioNet or will prompt on the first transaction. */ }
  return { account: handle.address, client };
}

export function txHash(value: unknown): Hash {
  const hash = typeof value === 'string' ? value
    : value && typeof value === 'object' && 'hash' in value ? String((value as { hash: unknown }).hash)
    : value && typeof value === 'object' && 'tx_id' in value ? String((value as { tx_id: unknown }).tx_id)
    : '';
  if (!/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('StudioNet did not return a transaction hash.');
  return hash as Hash;
}

export function proofIdFromReceipt(receipt: unknown): number {
  const data = receipt as { consensus_data?: { leader_receipt?: { mode?: string; result?: { payload?: { readable?: string } } | string }[] } };
  const leaders = data.consensus_data?.leader_receipt ?? [];
  const leader = leaders.find(item => item.mode === 'leader') ?? leaders[0];
  const readable = typeof leader?.result === 'string' ? leader.result : leader?.result?.payload?.readable;
  const id = Number(String(readable ?? '').replace(/"/g, ''));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Submit receipt did not return a proof ID.');
  return id;
}

export function studioError(error: unknown): string {
  const text = error instanceof Error ? `${error.message} ${error.cause ?? ''}` : String(error);
  if (/reference already submitted/i.test(text)) return 'This reference ID was already submitted from this StudioNet account. Use a new reference.';
  if (/evidence URL|allowlisted|pin a commit|canonical/i.test(text)) return 'Evidence URL must be HTTPS with a pinned GitHub commit or an IPFS CID.';
  if (/429|32429|rate/i.test(text)) return 'StudioNet rate limit hit. Wait a minute, then verify again.';
  if (/32028|in-flight/i.test(text)) return 'Too many pending StudioNet transactions. Wait for the previous proof to finish.';
  if (/did not return a (transaction hash|proof ID)/i.test(text)) return text;
  if (/Connect a wallet/i.test(text)) return 'Connect a wallet first, then click Verify.';
  if (/4001|UserRejected|denied|rejected/i.test(text)) return 'Wallet request declined. Approve the StudioNet transaction to verify.';
  return 'StudioNet could not finish verification. Check the evidence URL and try again.';
}
