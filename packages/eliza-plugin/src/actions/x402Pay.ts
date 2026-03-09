import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { MandateWallet, PolicyBlockedError } from '@mandate/sdk';
import { getConfig } from '../config.js';

export const x402PayAction: Action = {
  name: 'MANDATE_X402_PAY',
  description: 'Pay for an x402-gated resource with Mandate policy enforcement',
  similes: ['X402_PAY', 'PAY_API', 'PAY_FOR_CONTENT'],
  validate: async (runtime: IAgentRuntime) => {
    return !!(runtime.getSetting('MANDATE_RUNTIME_KEY') ?? process.env.MANDATE_RUNTIME_KEY);
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
    const url = options.url as string;

    try {
      const response = await wallet.x402Pay(url);
      const text = await response.text().catch(() => '');
      await callback?.({
        text: `x402 payment successful. Status: ${response.status}`,
        content: { status: response.status, body: text },
      });
      return true;
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        await callback?.({
          text: `Payment blocked: ${err.blockReason}`,
          content: { blocked: true, reason: err.blockReason },
        });
        return false;
      }
      throw err;
    }
  },
  examples: [],
};
