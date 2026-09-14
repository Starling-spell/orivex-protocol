import '../app.js';
import './wallet.css';
import('./genlayer').catch(() => {
  const slot = document.getElementById('genlayer-slot');
  if (slot) slot.textContent = 'Agent lab could not load. Reload the page or run npm run genlayer:check in the terminal.';
});

import('./wallet').then(module => module.mountWallet()).catch(() => {
  const slot = document.getElementById('wallet-slot');
  if (slot) {
    const button = document.createElement('button');
    button.className = 'wallet-btn';
    button.textContent = 'Retry wallet connection';
    button.onclick = () => window.location.reload();
    slot.replaceChildren(button);
  }
});
