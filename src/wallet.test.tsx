// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const sdk = vi.hoisted(() => ({
  auth: { ready: true, authenticated: false, user: null as any, login: vi.fn(), logout: vi.fn(), connectWallet: vi.fn() },
  walletState: { ready: false, wallets: [] as any[] },
}));
vi.mock('@privy-io/react-auth', () => ({
  PrivyProvider: ({children}: any) => children, usePrivy: () => sdk.auth, useWallets: () => sdk.walletState,
}));
let WalletApp: typeof import('./wallet')['WalletApp'];
beforeAll(async () => {
  document.body.innerHTML = '<div id="wallet-slot"></div><div id="register-form"></div><div id="deployment-slot"></div><div id="wallet-root"></div>';
  WalletApp = (await import('./wallet')).WalletApp;
});
beforeEach(() => {
  sdk.auth.authenticated = false; sdk.auth.ready = true; sdk.auth.user = null;
  sdk.walletState.wallets = []; sdk.walletState.ready = false;
  localStorage.clear(); vi.clearAllMocks();
});
afterEach(cleanup);

it('opens Privy login without waiting for an unauthenticated embedded wallet', () => {
  render(<WalletApp />);
  fireEvent.click(screen.getAllByRole('button', {name: 'Connect wallet'})[0]);
  expect(sdk.auth.login).toHaveBeenCalledOnce();
  expect(screen.queryByText(/0x8293/)).toBeNull();
});
it('waits for Privy initialization before allowing login', () => {
  sdk.auth.ready = false;
  render(<WalletApp />);
  expect((screen.getByRole('button', {name: 'Loading wallet…'}) as HTMLButtonElement).disabled).toBe(true);
});
it('allows switching networks before the registration form is filled', async () => {
  const switchChain = vi.fn().mockResolvedValue(undefined);
  sdk.auth.authenticated = true;
  sdk.walletState.ready = true;
  sdk.walletState.wallets = [{ address: '0x1111111111111111111111111111111111111111', chainId: 'eip155:8453', walletClientType: 'metamask', switchChain }];
  render(<WalletApp />);
  fireEvent.submit(document.querySelector('#register-form form')!);
  await waitFor(() => expect(switchChain).toHaveBeenCalledWith(84532));
  expect((document.querySelector('#register-form form') as HTMLFormElement).noValidate).toBe(true);
});
it('blocks registration when no contract is deployed', () => {
  sdk.auth.authenticated = true;
  sdk.walletState.ready = true;
  sdk.walletState.wallets = [{ address: '0x1111111111111111111111111111111111111111', chainId: 'eip155:84532', walletClientType: 'metamask' }];
  render(<WalletApp />);
  expect((screen.getByRole('button', {name: 'Register agent'}) as HTMLButtonElement).disabled).toBe(true);
});
