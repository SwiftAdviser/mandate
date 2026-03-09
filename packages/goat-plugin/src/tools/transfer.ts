import { Tool, ToolBase } from '@goat-sdk/core';
import type { EVMWalletClient } from '@goat-sdk/core';
import { MandateWallet, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';
import type { MandateConfig } from '../index.js';

interface TransferParams {
  to: `0x${string}`;
  amount: string;
  tokenAddress: `0x${string}`;
  waitForConfirmation?: boolean;
}

export class TransferTool extends ToolBase {
  constructor(private config: MandateConfig) {
    super();
  }

  @Tool({
    name: 'mandate_transfer',
    description: 'Transfer ERC20 tokens with Mandate spending policy enforcement. Throws if transaction exceeds configured limits.',
  })
  async transfer(_wallet: EVMWalletClient, params: TransferParams) {
    const mandateWallet = new MandateWallet({
      runtimeKey: this.config.runtimeKey,
      privateKey: this.config.privateKey,
      chainId: this.config.chainId ?? 84532,
      rpcUrl: this.config.rpcUrl,
    });

    try {
      const result = await mandateWallet.transfer(params.to, params.amount, params.tokenAddress, {
        waitForConfirmation: params.waitForConfirmation,
      });
      return { success: true, txHash: result.txHash, intentId: result.intentId, status: result.status.status };
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        throw new Error(`Transfer blocked by Mandate policy: ${err.blockReason}`);
      }
      if (err instanceof ApprovalRequiredError) {
        throw new Error(`Transfer requires approval. IntentId: ${err.intentId}`);
      }
      throw err;
    }
  }
}
