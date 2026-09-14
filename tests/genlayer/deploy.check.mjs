import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import deploy from "../../deploy/01-proof.js";

const root = process.cwd();
const source = readFileSync("contracts/OrivexProofRegistry.py", "utf8");
mkdirSync(".genlayer-local", { recursive: true });

test("refuses a fee-bearing network before fetching evidence or deploying", async () => {
  await assert.rejects(deploy({ chain: { id: 8453, isStudio: false } }), /studionet/);
});

for (const execution of ["ERROR", "SUCCESS"]) {
  test(`finalized ${execution} is handled independently from lifecycle status`, async () => {
    const directory = mkdtempSync(resolve(root, ".genlayer-local/deploy-check-"));
    const originalFetch = globalThis.fetch;
    let writes = 0;
    try {
      process.chdir(directory);
      mkdirSync("contracts");
      writeFileSync("contracts/OrivexProofRegistry.py", source);
      globalThis.fetch = async (url) => url.includes("api.github.com")
        ? new Response(JSON.stringify({ sha: "a".repeat(40) }))
        : new Response("MIT License test fixture");
      const address = "0x" + "1".repeat(40);
      const proof = { claim: "A test claim", evidence_sha256: "b".repeat(64), status: "SUCCESS" };
      const proof_hash = createHash("sha256").update(JSON.stringify(proof)).digest("hex");
      const client = {
        chain: { id: 61999, isStudio: true },
        deployContract: async () => "0x" + "2".repeat(64),
        waitForTransactionReceipt: async () => ({
          status: 7, status_name: "FINALIZED", data: { contract_address: address },
          from_address: "0x" + "3".repeat(40),
          consensus_data: { leader_receipt: [{ execution_result: execution }] },
        }),
        getContractCode: async () => source,
        getContractSchema: async () => ({ methods: { submit_proof: {}, verify_proof: {} } }),
        writeContract: async () => { writes++; return "0x" + String(writes + 3).repeat(64); },
        readContract: async () => JSON.stringify({ ...proof, proof_hash }),
      };
      if (execution === "ERROR") {
        await assert.rejects(deploy(client), /Contract execution failed/);
        assert.equal(writes, 0, "failed deployment cannot submit or verify a proof");
      } else {
        await deploy(client);
        const manifest = JSON.parse(readFileSync("deployments/genlayer-studionet.json", "utf8"));
        assert.equal(writes, 2);
        assert.equal(manifest.usableForProofs, true);
        assert.equal(manifest.smoke.proof.proof_hash, proof_hash);
      }
    } finally {
      globalThis.fetch = originalFetch;
      process.chdir(root);
    }
  });
}
