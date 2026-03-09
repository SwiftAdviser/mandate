import { Tool, ToolBase } from '@goat-sdk/core';
import type { EVMWalletClient } from '@goat-sdk/core';
import { MandateWallet, PolicyBlockedError } from '@mandate/sdk';
import type { MandateConfig } from '../index.js';

interface X402Params {
  url: string;
  headers?: Record<string, string>;
}

export class X402PayTool extends ToolBase {
  constructor(private config: MandateConfig) {
    super();
  }

  @Tool({
    name: 'mandate_x402_pay',
    description: 'Pay for an x402-gated resource (HTTP 402 payment required). Validates with Mandate policy before paying.',
  })
  async x402Pay(_wallet: EVMWalletClient, params: X402Params) {
    const mandateWallet = new MandateWallet({
      runtimeKey: this.config.runtimeKey,
      privateKey: this.config.privateKey,
      chainId: this.config.chainId ?? 84532,
      rpcUrl: this.config.rpcUrl,
    });

    try {
      const response = await mandateWallet.x402Pay(params.url, { headers: params.headers });
      return { success: true, status: response.status, ok: response.ok };
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        throw new Error(`Payment blocked by Mandate policy: ${err.blockReason}`);
      }
      throw err;
    }
  }
}
