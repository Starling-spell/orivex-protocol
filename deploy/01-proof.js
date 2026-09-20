import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const digest = (data) => createHash("sha256").update(data).digest("hex");
const save = (path, data) => writeFileSync(path, JSON.stringify(data,
  (_key, value) => typeof value === "bigint" ? value.toString() : value, 2) + "\n");

async function fetchOK(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "Orivex-Studio-Proof-Smoke" } });
  if (!response.ok) throw new Error(`Evidence fetch HTTP ${response.status}: ${url}`);
  return response;
}

async function receipt(client, hash, directory) {
  console.log(`Transaction submitted: ${hash}`);
  // Journal before waiting: a timeout must never trigger a blind rebroadcast.
  save(resolve(directory, `${hash}.pending.json`), { hash });
  const result = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", interval: 5000, retries: 100 });
  save(resolve(directory, `${hash}.json`), result);
  const leaders = result.consensus_data?.leader_receipt;
  if (!Array.isArray(leaders) || leaders.length === 0 || leaders.at(-1).execution_result !== "SUCCESS") {
    throw new Error(`Contract execution failed; inspect ${directory}/${hash}.json`);
  }
  if (result.status_name !== "FINALIZED" && result.status !== "FINALIZED" && result.status !== 7) {
    throw new Error(`Transaction is not finalized: ${hash}`);
  }
  return result;
}

/** Official GenLayer CLI deploy-script hook. The CLI manages wallet signing. */
async function deployProof(client) {
  if (process.env.ORIVEX_EXAMPLES_ONLY === '1') {
    return (await import('../scripts/run-genlayer-examples.mjs')).default(client);
  }
  if (client.chain?.id !== 61999 || !client.chain?.isStudio) {
    throw new Error("Select the built-in studionet network first: genlayer network set studionet");
  }
  const code = readFileSync("contracts/OrivexProofRegistry.py", "utf8");
  const sourceSha256 = digest(code);
  const directory = resolve("artifacts/genlayer", String(Date.now()));
  mkdirSync(directory, { recursive: true });
  mkdirSync("deployments", { recursive: true });

  // Real, small, public evidence at an immutable commit. This is a smoke proof
  // about a document, not a claim of agent identity or a Base transaction.
  const revision = await (await fetchOK("https://api.github.com/repos/OpenZeppelin/openzeppelin-contracts/commits/v5.4.0")).json();
  if (!/^[0-9a-f]{40}$/.test(revision.sha)) throw new Error("Invalid evidence commit SHA");
  const evidenceUrl = `https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/${revision.sha}/LICENSE`;
  const evidence = Buffer.from(await (await fetchOK(evidenceUrl)).arrayBuffer());
  if (evidence.length === 0 || evidence.length > 24000) throw new Error("Evidence size outside contract bounds");

  const tx = await client.deployContract({ code, args: [], leaderOnly: false });
  const deployed = await receipt(client, tx, directory);
  const address = deployed.data?.contract_address;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address || "")) throw new Error("Missing deployed contract address");
  const onchainCode = await client.getContractCode(address);
  if (digest(onchainCode) !== sourceSha256) throw new Error("Deployed source does not match local source");
  const schema = await client.getContractSchema(address);
  if (!schema.methods?.submit_proof || !schema.methods?.verify_proof) throw new Error("Missing proof methods");
  const manifest = {
    network: "studionet", chainId: 61999, rpc: "https://studio.genlayer.com/api",
    contract: "OrivexProofRegistry", address, deployer: deployed.from_address,
    deploymentTx: tx, status: "FINALIZED", execution: "SUCCESS", sourceSha256,
    sourceMatchesCurrent: true, usableForProofs: false,
    smoke: { status: "PENDING" },
  };
  save("deployments/genlayer-studionet.json", manifest);

  const reference = "smoke:openzeppelin-v5.4.0-license";
  const submitTx = await client.writeContract({ address, functionName: "submit_proof", value: 0n,
    args: [reference, "The document permits redistribution of the software subject to keeping the copyright and permission notice.",
      "SUCCESS if the license text explicitly grants distribution rights and requires preserving these notices.",
      evidenceUrl, digest(evidence)] });
  await receipt(client, submitTx, directory);
  const verifyTx = await client.writeContract({ address, functionName: "verify_proof", args: [1], value: 0n });
  await receipt(client, verifyTx, directory);
  const proof = JSON.parse(await client.readContract({ address, functionName: "get_proof", args: [1] }));
  const { proof_hash, ...committed } = proof;
  // This smoke record is ASCII; Python's ensure_ascii encoding is identical.
  const canonical = Object.fromEntries(Object.entries(committed).sort(([a], [b]) => a.localeCompare(b, "en")));
  if (proof.status !== "SUCCESS" || digest(JSON.stringify(canonical)) !== proof_hash) {
    throw new Error("Smoke proof did not succeed or its commitment did not reproduce");
  }
  manifest.usableForProofs = true;
  manifest.smoke = { status: "SUCCESS", submitTx, verifyTx, proof };
  save("deployments/genlayer-studionet.json", manifest);
  console.log(`Verified StudioNet proof contract: ${address}`);
  console.log(`Proof #1: ${proof_hash}`);
}

export { default } from "../scripts/deploy-studio-next.mjs";
