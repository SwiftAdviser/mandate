import { MandateWallet, PolicyBlockedError } from '@mandate/sdk';

export interface X402Params {
  url: string;
  headers?: Record<string, string>;
  runtimeKey?: string;
  privateKey?: string;
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
    },
    required: ['url'],
  },
  execute: async (
    params: X402Params,
    context?: { runtimeKey?: string; privateKey?: string; chainId?: number },
  ): Promise<{ success: boolean; status?: number; blocked?: boolean; reason?: string }> => {
    const runtimeKey = params.runtimeKey ?? context?.runtimeKey ?? process.env.MANDATE_RUNTIME_KEY ?? '';
    const privateKey = (params.privateKey ?? context?.privateKey ?? process.env.MANDATE_PRIVATE_KEY ?? '') as `0x${string}`;
    const chainId = params.chainId ?? context?.chainId ?? Number(process.env.MANDATE_CHAIN_ID ?? '84532');

    const wallet = new MandateWallet({ runtimeKey, privateKey, chainId });

    try {
      const response = await wallet.x402Pay(params.url, { headers: params.headers });
      return { success: true, status: response.status };
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        return { success: false, blocked: true, reason: err.blockReason };
      }
      throw err;
    }
  },
};
