function shellArg(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function cliPayload(contract: string, fields: { reference: string; claim: string; criterion: string; url: string; digest: string }) {
  const args = [fields.reference, fields.claim, fields.criterion, fields.url, fields.digest].map(shellArg).join(' ');
  return [
    'npx --no-install genlayer network set studionet',
    `npx --no-install genlayer write ${contract} submit_proof --args ${args}`,
    `npx --no-install genlayer write ${contract} verify_proof --args <PROOF_ID>`,
  ].join('\n');
}
