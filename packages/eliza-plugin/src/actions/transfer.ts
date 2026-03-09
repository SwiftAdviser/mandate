import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { MandateWallet, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';
import { getConfig } from '../config.js';

export const transferAction: Action = {
  name: 'MANDATE_TRANSFER',
  description: 'Transfer ERC20 tokens with Mandate policy enforcement',
  similes: ['TRANSFER_TOKENS', 'SEND_TOKENS', 'ERC20_TRANSFER'],
  validate: async (runtime: IAgentRuntime) => {
    const key = runtime.getSetting('MANDATE_RUNTIME_KEY') ?? process.env.MANDATE_RUNTIME_KEY;
    return !!key;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    options: Record<string, unknown> = {},
    callback?: HandlerCallback,
  ) => {
    const config = getConfig(runtime);
    const wallet = new MandateWallet(config);

    const to = options.to as `0x${string}`;
    const amount = options.amount as string;
    const tokenAddress = options.tokenAddress as `0x${string}`;

    try {
      const result = await wallet.transfer(to, amount, tokenAddress);
      await callback?.({
        text: `Transfer successful. TxHash: ${result.txHash}. IntentId: ${result.intentId}`,
        content: result,
      });
      return true;
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        await callback?.({
          text: `Transfer blocked by Mandate policy: ${err.blockReason}`,
          content: { blocked: true, reason: err.blockReason },
        });
        return false;
      }
      if (err instanceof ApprovalRequiredError) {
        await callback?.({
          text: `Transfer requires approval. IntentId: ${err.intentId}. ApprovalId: ${err.approvalId}`,
          content: { requiresApproval: true, intentId: err.intentId, approvalId: err.approvalId },
        });
        return false;
      }
      throw err;
    }
  },
  examples: [
    [
      { user: 'user', content: { text: 'Transfer 10 USDC to 0x1234' } },
      { user: 'agent', content: { text: 'Transfer successful. TxHash: 0x...', action: 'MANDATE_TRANSFER' } },
    ],
  ],
};
