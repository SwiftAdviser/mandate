/**
 * Mandate SDK Quickstart
 *
 * Prerequisites:
 *   1. bun add @mandate/sdk viem
 *   2. Set MANDATE_RUNTIME_KEY in .env (or register below)
 *   3. Set AGENT_PRIVATE_KEY in .env
 *
 * Run: bun run examples/quickstart.ts
 */

import { MandateWallet, MandateClient, USDC, CHAIN_ID } from '@mandate/sdk';

const RECIPIENT = '0x0000000000000000000000000000000000000001' as `0x${string}`;

async function main() {
  // Step 1: Register (skip if you already have a runtimeKey)
  let runtimeKey = process.env.MANDATE_RUNTIME_KEY;

  if (!runtimeKey) {
    console.log('No runtimeKey found. Registering new agent...');
    const reg = await MandateClient.register({
      name: 'QuickstartAgent',
      walletAddress: '0x0000000000000000000000000000000000000000', // replace with your EVM, Solana, or TON address
      chainId: CHAIN_ID.BASE_SEPOLIA,
    });
    runtimeKey = reg.runtimeKey;
    console.log(`Registered! runtimeKey: ${runtimeKey}`);
    console.log(`Claim URL: ${reg.claimUrl}`);
    console.log('Save runtimeKey to .env as MANDATE_RUNTIME_KEY');
  }

  // Step 2: Create MandateWallet
  const wallet = new MandateWallet({
    runtimeKey,
    privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
    chainId: CHAIN_ID.BASE_SEPOLIA,
  });

  console.log(`Wallet address: ${wallet.address}`);

  // Step 3: Transfer with policy enforcement
  try {
    const { txHash, intentId, status } = await wallet.transfer(
      RECIPIENT,
      '1000000', // 1 USDC (6 decimals)
      USDC.BASE_SEPOLIA,
    );

    console.log(`Transfer successful!`);
    console.log(`  txHash:   ${txHash}`);
    console.log(`  intentId: ${intentId}`);
    console.log(`  status:   ${status.status}`);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'blockReason' in err) {
      console.error(`Blocked: ${(err as { blockReason: string }).blockReason}`);
      if ('detail' in err) {
        console.error(`Detail: ${(err as { detail: string }).detail}`);
      }
    } else {
      throw err;
    }
  }
}

main().catch(console.error);
