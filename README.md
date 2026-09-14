# Orivex Protocol

Frontend MVP for **Proof of Intelligent Action**. The landing page uses a Vite/React GenLayer StudioNet agent lab. Open it through the development server, not directly from disk.

## Included

- Responsive landing page with Orivex brand system
- GenLayer StudioNet proof registry for independently verified, content-addressed evidence
- Agent registry with search and trust metadata
- Evidence submission flow with pending states
- Certificate preview and deterministic verification language
- Reputation score and live trust graph visualization
- Developer API example and register-agent modal
- Privy wallet/email authentication, embedded wallets, wallet selection and logout
- GenLayer StudioNet agent verification with finalized consensus receipts
- Atomic deployment of all four protocol contracts from the connected wallet

## Run

```bash
npm ci
npm run contracts:build
npm run dev
```

## Privy configuration

Copy `.env.example` to `.env.local` only if `.env.local` does not already exist. Set `VITE_PRIVY_APP_ID` to the public ID from the [Privy dashboard](https://dashboard.privy.io). No Privy app secret belongs in the frontend.

Enable Ethereum wallets and email login in Privy. Add `http://127.0.0.1:5173`, `http://localhost:5173`, and your published HTTPS origin to its allowed origins. The SDK uses the dark theme and only supports Base Sepolia. The supplied public App ID is already configured locally.

## Deploy on Base Sepolia

Use a fresh wallet with Base Sepolia test ETH. Never reuse a wallet whose private key was shared in chat. [Base network reference](https://docs.base.org/base-chain/api-reference/rpc-overview).

1. Start the app and open `http://127.0.0.1:5173/#deploy`.
2. Connect through Privy and switch to Base Sepolia.
3. Select **Review deployment**. Check the owner and estimated execution gas; the wallet supplies the final network fee including Base data costs.
4. Select **Deploy protocol** and sign in the wallet. The transaction deploys `AgentRegistry`, `ActionCertificate`, `ReputationRegistry`, and `AgentPermission` atomically.
5. After two confirmations, the page shows explorer links and enables registration. The confirmed deployment is remembered for that wallet in this browser and revalidated against onchain bytecode when reopened.
6. Set the resulting addresses in `.env.local` (or hosting environment variables), then rebuild to share the same deployment with all visitors. `VITE_AGENT_REGISTRY_ADDRESS` enables registration for everyone.

For CLI deployment with an encrypted Foundry keystore:

```powershell
$env:DEPLOYER_ADDRESS = 'YOUR_PUBLIC_WALLET_ADDRESS'
npm run deploy:base-sepolia -- --account your-keystore-name
npm run deploy:base-sepolia -- --account your-keystore-name --broadcast
```

The first command estimates gas without sending. The broadcast command prompts through Foundry for the keystore password, verifies the owner and receipt, saves `deployments/base-sepolia.json`, and updates public addresses in `.env.local`. No private key is read by the application or passed as a command argument.

## GenLayer StudioNet proofs

`contracts/OrivexProofRegistry.py` targets StudioNet (chain ID 61999). It accepts a claim, criterion, immutable evidence URL and SHA-256 digest. `verify_proof` fetches the complete evidence and runs the same decision independently in validators; only an agreed `SUCCESS`, `FAILED` or `INCONCLUSIVE` result is persisted. The proof hash binds the contract, chain, submitter, claim, criterion, evidence and decision. References are scoped to the submitter.

The live StudioNet deployment is usable for proofs at `0xd8571C4605C3Fb63B02b75614a53d753656e66a1`. Smoke proof #1 and five varied agent examples have finalized consensus receipts; see [docs/RESULTS.md](docs/RESULTS.md).

```powershell
python -m venv .venv-genlayer
.\.venv-genlayer\Scripts\python.exe -m pip install -r requirements-genlayer.txt
npm run genlayer:lint
npm run genlayer:test
npm run genlayer:studio
# The dedicated account was created through the CLI; signing uses its OS keychain cache.
npx --no-install genlayer account use studio-proof-deployer
npm run genlayer:deploy
```

The CLI runs `deploy/01-proof.js`: deploy, wait for successful finalized execution, check source/schema, submit a real document proof, verify it through consensus, then reproduce its hash. Run `npm run genlayer:examples` for the five agent programs, `npm run genlayer:check` to validate receipts and commitments, and `npm run genlayer:publish` to copy evidence into the Vite app. It saves transaction journals under `artifacts/genlayer` and updates [deployments/genlayer-studionet.json](deployments/genlayer-studionet.json).

StudioNet is gasless ([network reference](https://docs.genlayer.com/developers/networks)). Evidence must be UTF-8, 1–24000 bytes, served from an allowed IPFS gateway or raw GitHub URL with a full commit hash. A content hash commits to bytes; it does not establish a document's truth, agent identity or Base ownership. Claim and criterion are submitter supplied. No Base bridge, role grant, reputation update or automated certificate finalization is connected. The dedicated account is for this Studio development work; keep signing in the CLI/OS keychain and do not put keys in application configuration.

## Build and checks

```bash
npm run contracts:test
npm test
npm run build
npm run preview
```

The Solidity tests cover access control, replay prevention, locked evidence, capability reputation, cumulative permission budgets, expiry, revocation and testnet-only deployment. The build exports ABIs and deployment bytecode from Solidity 0.8.24 and pinned OpenZeppelin 5.4.0 sources. Foundry is provided as a development dependency; a standard Foundry installation also works.

## Hosting

Import this directory into Vercel and set the `VITE_*` public configuration values. `vercel.json` builds the Vite app and serves `dist`. Add the resulting HTTPS domain to Privy’s allowed origins. The website is hosted separately from the contracts on Base Sepolia.

## Current limits

Agent listings, metrics, trust graph and certificates are labeled demonstration data. The GenLayer bridge, backend API and database are not connected. No verification result is generated by the wallet integration. `VALIDATOR_ROLE` and `VERIFIER_ROLE` stay unassigned at deployment; admin status alone cannot finalize a certificate. Grant them only to a reviewed consensus bridge. The permission contract tracks a budget but cannot constrain purchases that bypass it. These contracts do not custody USDC or charge a registration fee. This remains a testnet MVP, not an audited production protocol.
