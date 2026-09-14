import '../app.js';
import('./genlayer').catch(() => {
  const slot = document.getElementById('genlayer-slot');
  if (slot) slot.textContent = 'Agent lab could not load. Reload the page or run npm run genlayer:check in the terminal.';
});
