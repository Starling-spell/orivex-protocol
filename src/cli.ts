export function cliPayload(contract: string, fields: { reference: string; claim: string; criterion: string; url: string; digest: string }) {
  return `genlayer contract write ${contract} submit_proof "${fields.reference}" "${fields.claim}" "${fields.criterion}" "${fields.url}" "${fields.digest}"\ngenlayer contract write ${contract} verify_proof <PROOF_ID>`;
}
