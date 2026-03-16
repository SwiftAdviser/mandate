/**
 * Wrapping an existing wallet with MandateWallet
 *
 * This example shows how to add Mandate policy enforcement
 * to ANY existing wallet — PaySponge, AgentKit, ethers, etc.
 *
 * Run: bun run examples/wrap-existing-wallet.ts
 */

import { MandateWallet, USDC, CHAIN_ID } from '@mandate/sdk';
import type { ExternalSigner } from '@mandate/sdk';

const RECIPIENT = '0x0000000000000000000000000000000000000001' as `0x${string}`;

// Example 1: Wrap a generic signer
function wrapGenericWallet(yourWallet: {
  sendTransaction: (tx: unknown) => Promise<string>;
  getAddress: () => string;
}): ExternalSigner {
  return {
    sendTransaction: async (tx) => {
      const hash = await yourWallet.sendTransaction(tx);
      return hash as `0x${string}`;
    },
    getAddress: () => yourWallet.getAddress() as `0x${string}`,
  };
}

// Example 2: Wrap PaySponge API
function wrapPaySponge(apiKey: string, walletAddress: `0x${string}`): ExternalSigner {
  return {
    sendTransaction: async (tx) => {
      const res = await fetch('https://api.wallet.paysponge.com/api/transfers/evm', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chain: 'base',
          to: tx.to,
          amount: tx.value?.toString(),
          currency: 'USDC',
        }),
      });
      const data = await res.json();
      return data.txHash as `0x${string}`;
    },
    getAddress: () => walletAddress,
  };
}

async function main() {
  const runtimeKey = process.env.MANDATE_RUNTIME_KEY;
  if (!runtimeKey) {
    console.error('Set MANDATE_RUNTIME_KEY in .env');
    process.exit(1);
  }

  // Option A: Wrap a generic wallet
  const genericSigner = wrapGenericWallet({
    sendTransaction: async (tx) => '0x' + 'ab'.repeat(32), // your wallet's sendTransaction
    getAddress: () => '0x1234567890abcdef1234567890abcdef12345678',
  });

  const wallet = new MandateWallet({
    runtimeKey,
    chainId: CHAIN_ID.BASE_SEPOLIA,
    signer: genericSigner,
  });

  console.log(`Wrapped wallet address: ${wallet.address}`);

  // Now all transfers go through Mandate policy check first
  try {
    const result = await wallet.transfer(RECIPIENT, '1000000', USDC.BASE_SEPOLIA);
    console.log(`Transfer: ${result.status.status}`);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'blockReason' in err) {
      console.error(`Policy blocked: ${(err as { blockReason: string }).blockReason}`);
    } else {
      throw err;
    }
  }
}

main().catch(console.error);
