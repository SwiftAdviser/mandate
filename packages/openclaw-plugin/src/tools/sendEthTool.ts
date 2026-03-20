import { MandateWallet, PolicyBlockedError, ApprovalRequiredError } from '@mandate.md/sdk';

export interface SendEthParams {
  to: string;
  valueWei: string;
  chainId?: number;
}

export const sendEthTool = {
  name: 'mandate_send_eth',
  description: 'Send native ETH/MATIC with Mandate policy enforcement. Transaction will be blocked if it exceeds configured spending limits.',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient EVM address (0x...)',
      },
      valueWei: {
        type: 'string',
        description: 'Amount in wei (e.g. "1000000000000000000" = 1 ETH)',
      },
      chainId: {
        type: 'number',
        description: 'Chain ID (default: from env MANDATE_CHAIN_ID)',
      },
    },
    required: ['to', 'valueWei'],
  },
  execute: async (
    params: SendEthParams,
    context?: { runtimeKey?: string; privateKey?: string; chainId?: number },
  ): Promise<{ success: boolean; txHash?: string; intentId?: string; blocked?: boolean; reason?: string; declineMessage?: string; requiresApproval?: boolean; approvalReason?: string }> => {
    const runtimeKey = context?.runtimeKey ?? '';
    const privateKey = (context?.privateKey ?? '') as `0x${string}`;
    const chainId = params.chainId ?? context?.chainId ?? 84532;

    const wallet = new MandateWallet({ runtimeKey, privateKey, chainId });

    try {
      const result = await wallet.sendEth(
        params.to as `0x${string}`,
        params.valueWei,
      );
      return { success: true, txHash: result.txHash, intentId: result.intentId };
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        return { success: false, blocked: true, reason: err.blockReason, declineMessage: err.declineMessage };
      }
      if (err instanceof ApprovalRequiredError) {
        return { success: false, requiresApproval: true, intentId: err.intentId, approvalReason: err.approvalReason };
      }
      throw err;
    }
  },
};
