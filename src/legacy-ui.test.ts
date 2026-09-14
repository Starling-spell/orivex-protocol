// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '';
  vi.resetModules();
});

it('does not crash the page when the registration modal is missing', async () => {
  document.body.innerHTML = '<div id="agentTable"></div><input id="agentSearch" /><button id="verifyBtn"></button><div id="toast"></div>';
  await expect(import('../app.js')).resolves.toBeDefined();
  expect(document.querySelector('.agent-row')).not.toBeNull();
});

it('opens and closes the restored registration modal', async () => {
  document.body.innerHTML = `
    <a href="#register-agent" data-view="register">Create an agent</a>
    <div id="agentTable"></div>
    <input id="agentSearch" />
    <button id="verifyBtn"></button>
    <div id="toast"></div>
    <div class="modal-backdrop" id="registerModal" hidden>
      <div class="modal" id="register-agent">
        <button id="closeModal" type="button">×</button>
        <div id="register-form"></div>
      </div>
    </div>`;
  await import('../app.js');
  const modal = document.getElementById('registerModal') as HTMLElement;
  expect(modal.hidden).toBe(true);
  document.querySelector('[data-view="register"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  expect(modal.hidden).toBe(false);
  document.getElementById('closeModal')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(modal.hidden).toBe(true);
});
