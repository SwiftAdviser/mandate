import { MandateWallet, PolicyBlockedError } from '@mandate.md/sdk';

export interface X402Params {
  url: string;
  headers?: Record<string, string>;
  chainId?: number;
}

export const x402Tool = {
  name: 'mandate_x402_pay',
  description: 'Pay for an x402-gated resource with Mandate policy enforcement.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL of the x402-gated resource',
      },
      headers: {
        type: 'object',
        description: 'Optional extra headers to include in the request',
        additionalProperties: { type: 'string' },
      },
      chainId: {
        type: 'number',
        description: 'Chain ID (default: from env MANDATE_CHAIN_ID)',
      },
    },
    required: ['url'],
  },
  execute: async (
    params: X402Params,
    context?: { runtimeKey?: string; privateKey?: string; chainId?: number },
  ): Promise<{ success: boolean; status?: number; blocked?: boolean; reason?: string; declineMessage?: string }> => {
    const runtimeKey = context?.runtimeKey ?? '';
    const privateKey = (context?.privateKey ?? '') as `0x${string}`;
    const chainId = params.chainId ?? context?.chainId ?? 84532;

    const wallet = new MandateWallet({ runtimeKey, privateKey, chainId });

    try {
      const response = await wallet.x402Pay(params.url, { headers: params.headers });
      return { success: true, status: response.status };
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        return { success: false, blocked: true, reason: err.blockReason, declineMessage: err.declineMessage };
      }
      throw err;
    }
  },
};
