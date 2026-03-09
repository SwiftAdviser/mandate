import { GameWorker, GameFunction } from '@virtuals-protocol/game';
import { MandateWallet, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';
import type { MandateWalletConfig } from '@mandate/sdk';

export interface MandateGameConfig extends MandateWalletConfig {
  workerDescription?: string;
}

function createTransferFunction(config: MandateGameConfig): GameFunction {
  return new GameFunction({
    name: 'mandate_transfer',
    description: 'Transfer ERC20 tokens with Mandate policy enforcement. Blocked if spending limits are exceeded.',
    args: [
      { name: 'to', description: 'Recipient EVM address (0x...)' },
      { name: 'amount', description: 'Amount in token smallest units (e.g., "1000000" = 1 USDC)' },
      { name: 'token_address', description: 'ERC20 token contract address (0x...)' },
    ],
    executable: async (args: Record<string, string>, logger: (msg: string) => void) => {
      const wallet = new MandateWallet(config);
      logger(`Initiating transfer to ${args.to}, amount ${args.amount}`);

      try {
        const result = await wallet.transfer(
          args.to as `0x${string}`,
          args.amount,
          args.token_address as `0x${string}`,
        );
        logger(`Transfer successful: ${result.txHash}`);
        return {
          status: 'done',
          result: JSON.stringify({ txHash: result.txHash, intentId: result.intentId }),
        };
      } catch (err) {
        if (err instanceof PolicyBlockedError) {
          logger(`Transfer blocked: ${err.blockReason}`);
          return { status: 'failed', result: `Blocked by policy: ${err.blockReason}` };
        }
        if (err instanceof ApprovalRequiredError) {
          logger(`Transfer requires approval: ${err.intentId}`);
          return { status: 'pending', result: `Approval required. IntentId: ${err.intentId}` };
        }
        throw err;
      }
    },
  });
}

function createX402PayFunction(config: MandateGameConfig): GameFunction {
  return new GameFunction({
    name: 'mandate_x402_pay',
    description: 'Pay for an x402-gated API/resource with Mandate policy enforcement.',
    args: [
      { name: 'url', description: 'URL of the resource requiring x402 payment' },
    ],
    executable: async (args: Record<string, string>, logger: (msg: string) => void) => {
      const wallet = new MandateWallet(config);
      logger(`Paying for x402 resource: ${args.url}`);

      try {
        const response = await wallet.x402Pay(args.url);
        return { status: 'done', result: `Payment successful. HTTP ${response.status}` };
      } catch (err) {
        if (err instanceof PolicyBlockedError) {
          return { status: 'failed', result: `Blocked by policy: ${err.blockReason}` };
        }
        throw err;
      }
    },
  });
}

export function createMandateWorker(config: MandateGameConfig): GameWorker {
  return new GameWorker({
    id: 'mandate-worker',
    name: 'Mandate Finance Worker',
    description: config.workerDescription ?? 'Executes on-chain transactions with Mandate spending policy enforcement.',
    functions: [createTransferFunction(config), createX402PayFunction(config)],
    getEnvironment: async () => ({
      chainId: String(config.chainId ?? 84532),
      policyEnforcement: 'active',
    }),
  });
}

/** Convenience: create a GameWorker with Mandate tools */
export const mandateGameWorker = (config: MandateGameConfig) => createMandateWorker(config);

export { createTransferFunction, createX402PayFunction };
