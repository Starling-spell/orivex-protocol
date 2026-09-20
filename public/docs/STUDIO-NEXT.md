# Orivex Agent Lab — Studio Next

Live Lab: https://orivex-protocol.vercel.app/#deploy

Network: **Studio Next / studio-dev, chain 61997**. RPC: https://studio-dev.genlayer.com/api. Contract: [0xdf47bC4B2AA10BDD3650acbE2f498FB4Acd550c8](https://explorer-studio-dev.genlayer.com/address/0xdf47bC4B2AA10BDD3650acbE2f498FB4Acd550c8).

## Exact review path

1. Open the Lab. Confirm its heading says Studio Next, chain 61997.
2. Inspect Document smoke proof #1, then click **Recheck onchain**. The app checks deployed source, finalized verification receipt, submitter and proof SHA-256.
3. For a new claim, connect your wallet, enter a unique reference, claim and criterion, and an immutable HTTPS evidence URL. Click **Fetch and hash evidence**, then **Verify**.
4. Switch the wallet to chain 61997 and approve the claim submission and judgment transactions. Live fee estimates are included; rejection or a wrong chain stops the operation.
5. Wait for both transactions to finalize successfully. Pending hashes are displayed and saved locally. Do not submit duplicates after an RPC timeout; use the proof ID lookup and receipt links.

## Verified example

Claim: The document permits redistribution of the software subject to keeping the copyright and permission notice.

Criterion: SUCCESS if the license text explicitly grants distribution rights and requires preserving these notices.

Evidence: https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/c64a1edb67b6e3f4a15cca8909c9482ad33a02b0/LICENSE

Evidence SHA-256: `13cd784a6c31361f0e0c6aa3b410a1cb9a079868b7314c13e3eb8a75351746b9`

Result: **SUCCESS**. Proof ID: **1**. Proof SHA-256: `d3412b24063464910bcd04535e32788f1fd92de5555e553f6352bf720cd91e67`.

Deployment transaction: `0xbf4d8d97cd171a85129d87e5b5c1234196c3d1942f51970fcfaaaeb2bb0dc46f`

Submit transaction: `0xe904d9b2d2138353dcb15c7bf57ac0bbc5e0debed357093212ec35ebd8a52c36`

Verify transaction: `0x2631ec863c43729761bdb5b4129a5a2d17d4b6ceab2ef20e8d1c637acb4aa768`

All three receipts are FINALIZED with FINISHED_WITH_RETURN. The judgment was read from chain 61997 and its commitment reproduced.

[Live deployment JSON](/genlayer-studio-next.json) · [Full verification receipt](/receipts/0x2631ec863c43729761bdb5b4129a5a2d17d4b6ceab2ef20e8d1c637acb4aa768.json)

## Developer reproduction

```sh
npm ci
npm run genlayer:studio
npx --no-install genlayer account list
# Select and unlock your own deployment account.
npm run genlayer:deploy
npm run genlayer:check
npm test
npm run build
```

CLI is pinned to 0.40.0-rc.3; SDK to 2.0.0-rc.1. The deployment hook journals hashes under artifacts/genlayer-next and resumes saved steps. Fee time allocations are the tested development preset (100 leader / 200 validator); profile larger workloads before changing them. Do not delete journals while transactions are pending.

## Historical network

The old contract 0xd8571C4605C3Fb63B02b75614a53d753656e66a1 and its five example receipts belong to StudioNet **61999**. They are historical evidence, not Studio Next deployments. The live Lab uses the new manifest and never imports those old proofs. Agent identities, Base certificates and other overview metrics remain demonstrations; no Base settlement bridge is configured.
