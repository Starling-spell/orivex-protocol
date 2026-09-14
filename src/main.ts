import '../app.js';
import './wallet.css';
const bootTimer = window.setTimeout(() => {
  const wallet = document.getElementById('wallet-slot');
  if (wallet?.textContent?.includes('Loading wallet')) wallet.innerHTML = '<button class="wallet-btn" onclick="alert(\'Privy wallet module did not load. Check VITE_PRIVY_APP_ID and reload.\')">Connect wallet</button>';
  const lab = document.getElementById('genlayer-slot');
  if (lab?.textContent?.includes('Loading GenLayer')) lab.innerHTML = '<p>Agent Lab is taking too long to load. <a href="/docs/guide.html">Open the verification guide ↗</a></p>';
}, 5000);
import('./genlayer').then(() => window.clearTimeout(bootTimer)).catch(() => {
  const slot = document.getElementById('genlayer-slot');
  if (slot) slot.textContent = 'Agent lab could not load. Reload the page or run npm run genlayer:check in the terminal.';
});
import('./wallet').then(module => module.mountWallet()).then(() => window.clearTimeout(bootTimer)).catch(() => {
  const slot = document.getElementById('wallet-slot');
  if (slot) slot.textContent = 'Wallet unavailable — check VITE_PRIVY_APP_ID.';
});
