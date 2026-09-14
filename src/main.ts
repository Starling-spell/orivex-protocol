import '../app.js';
import './wallet.css';
import('./genlayer').catch(() => {
  const slot = document.getElementById('genlayer-slot');
  if (slot) slot.textContent = 'Agent lab could not load. Reload the page or run npm run genlayer:check in the terminal.';
});
import('./wallet').then(module => module.mountWallet()).catch(() => {
  const slot = document.getElementById('wallet-slot');
  if (slot) slot.textContent = 'Wallet unavailable — check VITE_PRIVY_APP_ID.';
});
