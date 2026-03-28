/**
 * Mint Mandate as an ERC-8004 agent on Base Sepolia.
 *
 * Usage:
 *   MINT_PRIVATE_KEY=0x... bun scripts/mint-erc8004.ts
 *
 * Optional env:
 *   CHAIN_ID         - default 84532 (Base Sepolia)
 *   RPC_URL          - default https://sepolia.base.org
 *   REGISTRATION_URL - default https://app.mandate.md/.well-known/agent-registration.json
 */

import { SDK } from 'agent0-sdk';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

const CHAIN_ID = Number(process.env.CHAIN_ID ?? 84532);
const RPC_URL = process.env.RPC_URL ?? 'https://sepolia.base.org';
const REGISTRATION_URL =
  process.env.REGISTRATION_URL ??
  'https://app.mandate.md/.well-known/agent-registration.json';

// Accept either private key or mnemonic
const privateKey = process.env.MINT_PRIVATE_KEY;
const mnemonic = process.env.MINT_MNEMONIC;

if (!privateKey && !mnemonic) {
  console.error('MINT_PRIVATE_KEY or MINT_MNEMONIC is required');
  process.exit(1);
}

async function main() {
  console.log(`Minting Mandate agent on chain ${CHAIN_ID}...`);
  console.log(`Registration URL: ${REGISTRATION_URL}`);

  const signer = privateKey
    ? privateKeyToAccount(privateKey as `0x${string}`)
    : mnemonicToAccount(mnemonic!);

  console.log(`Signer: ${signer.address}`);

  const sdk = new SDK({
    chainId: CHAIN_ID,
    rpcUrl: RPC_URL,
    signer,
  });

  const agent = sdk.createAgent(
    'Mandate',
    'Non-custodial agent wallet policy layer. Enforces spend limits, allowlists, and approval workflows for AI agent transactions without receiving private keys. Pay-per-call validation via x402 protocol.',
    'https://app.mandate.md/mandate-logo.png',
  );

  agent.setActive(true);
  agent.setTrust(true); // reputation

  // Register with HTTPS URI (no IPFS needed)
  console.log(`Calling registerHTTP("${REGISTRATION_URL}")...`);
  const result = await agent.registerHTTP(REGISTRATION_URL);

  console.log('');
  console.log('Agent minted successfully!');
  console.log(`Agent ID: ${result.agentId}`);
  console.log(`Registry address: 0x8004A818BFB912233c491871b3d84c89A494BD9e`);
  console.log(`Chain: eip155:${CHAIN_ID}`);
  console.log('');
  console.log('Update public/.well-known/agent-registration.json registrations:');
  console.log(JSON.stringify({
    registrations: [{
      agentId: result.agentId,
      agentRegistry: `eip155:${CHAIN_ID}:0x8004A818BFB912233c491871b3d84c89A494BD9e`,
    }],
  }, null, 2));
}

main().catch((err) => {
  console.error('Mint failed:', err);
  process.exit(1);
});
