import { MandateWallet, PolicyBlockedError, ApprovalRequiredError } from '@mandate.md/sdk';

export interface TransferParams {
  to: string;
  amount: string;
  tokenAddress: string;
  chainId?: number;
}

export const transferTool = {
  name: 'mandate_transfer',
  description: 'Transfer ERC20 tokens with Mandate policy enforcement. Transaction will be blocked if it exceeds configured spending limits.',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient EVM address (0x...)',
      },
      amount: {
        type: 'string',
        description: 'Amount in token smallest units (e.g. "1000000" = 1 USDC at 6 decimals)',
      },
      tokenAddress: {
        type: 'string',
        description: 'ERC20 token contract address (0x...)',
      },
      chainId: {
        type: 'number',
        description: 'Chain ID (default: from env MANDATE_CHAIN_ID)',
      },
    },
    required: ['to', 'amount', 'tokenAddress'],
  },
  execute: async (
    params: TransferParams,
    context?: { runtimeKey?: string; privateKey?: string; chainId?: number },
  ): Promise<{ success: boolean; txHash?: string; intentId?: string; blocked?: boolean; reason?: string; declineMessage?: string; requiresApproval?: boolean; approvalReason?: string }> => {
    const runtimeKey = context?.runtimeKey ?? '';
    const privateKey = (context?.privateKey ?? '') as `0x${string}`;
    const chainId = params.chainId ?? context?.chainId ?? 84532;

    const wallet = new MandateWallet({ runtimeKey, privateKey, chainId });

    try {
      const result = await wallet.transfer(
        params.to as `0x${string}`,
        params.amount,
        params.tokenAddress as `0x${string}`,
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
