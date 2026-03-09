import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { MandateWallet, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';
import { getConfig } from '../config.js';

export const sendEthAction: Action = {
  name: 'MANDATE_SEND_ETH',
  description: 'Send native ETH with Mandate policy enforcement',
  similes: ['SEND_ETH', 'TRANSFER_ETH', 'SEND_NATIVE'],
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
    const valueWei = options.valueWei as string;

    try {
      const result = await wallet.sendEth(to, valueWei);
      await callback?.({
        text: `ETH transfer successful. TxHash: ${result.txHash}. IntentId: ${result.intentId}`,
        content: result,
      });
      return true;
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        await callback?.({
          text: `ETH transfer blocked by Mandate policy: ${err.blockReason}`,
          content: { blocked: true, reason: err.blockReason },
        });
        return false;
      }
      if (err instanceof ApprovalRequiredError) {
        await callback?.({
          text: `ETH transfer requires approval. IntentId: ${err.intentId}. ApprovalId: ${err.approvalId}`,
          content: { requiresApproval: true, intentId: err.intentId, approvalId: err.approvalId },
        });
        return false;
      }
      throw err;
    }
  },
  examples: [
    [
      { user: 'user', content: { text: 'Send 0.01 ETH to 0x5678' } },
      { user: 'agent', content: { text: 'ETH transfer successful. TxHash: 0x...', action: 'MANDATE_SEND_ETH' } },
    ],
  ],
};
