import { createPublicClient, http, isAddress, getAddress, zeroAddress, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

export const chain = baseSepolia;
export const rpcUrl = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
export const publicClient = createPublicClient({ chain, transport: http(rpcUrl), pollingInterval: 3000 });
export const appId = import.meta.env.VITE_PRIVY_APP_ID?.trim();
export const registryAddress = configuredAddress(import.meta.env.VITE_AGENT_REGISTRY_ADDRESS);

export function configuredAddress(value?: string): Address | undefined {
  if (!value || !isAddress(value) || value.toLowerCase() === zeroAddress) return undefined;
  return getAddress(value);
}
export function normalizeMetadata(value: string): string {
  const uri = value.trim();
  if (new TextEncoder().encode(uri).length > 2048) throw new Error('Metadata URI is too long.');
  try {
    const url = new URL(uri);
    if (!['https:', 'ipfs:', 'ar:'].includes(url.protocol) || !url.hostname) throw new Error();
  } catch { throw new Error('Enter a valid HTTPS, IPFS, or Arweave metadata URI.'); }
  return uri;
}
export function walletError(error: unknown): string {
  let current: any = error;
  for (let depth = 0; current && depth < 8; depth++, current = current.cause) {
    if (current.code === 4001 || current.name === 'UserRejectedRequestError') return 'Request declined in your wallet. You can try again.';
    if (/insufficient funds/i.test(current.message ?? '')) return 'Your wallet needs Base Sepolia test ETH for gas.';
    if (current.name === 'ChainMismatchError') return 'Switch your wallet to Base Sepolia.';
  }
  return error instanceof Error && !('shortMessage' in error) && error.message.length < 180
    ? error.message : 'The wallet request failed. Check the network and try again.';
}
