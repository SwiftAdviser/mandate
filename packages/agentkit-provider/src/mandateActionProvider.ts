import { ActionProvider, CreateAction, WalletProvider } from '@coinbase/agentkit';
import { MandateWallet, PolicyBlockedError, ApprovalRequiredError } from '@mandate/sdk';
import { TransferSchema, X402PaySchema, GetPolicySchema, GetQuotaSchema } from './schemas.js';
import type { MandateWalletProvider } from './mandateWalletProvider.js';
import type { TransferInput, X402PayInput } from './schemas.js';

export class MandateActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super('mandate', []);
  }

  @CreateAction({
    name: 'mandate_transfer',
    description: 'Transfer ERC20 tokens with Mandate policy enforcement. Will be blocked if transaction exceeds configured spending limits.',
    schema: TransferSchema,
  })
  async transfer(walletProvider: WalletProvider, args: TransferInput): Promise<string> {
    const mandateProvider = walletProvider as MandateWalletProvider;
    const wallet = mandateProvider.getMandateWallet?.() ?? (walletProvider as unknown as { wallet: MandateWallet }).wallet;

    try {
      const result = await (wallet as MandateWallet).transfer(
        args.to as `0x${string}`,
        args.amount,
        args.tokenAddress as `0x${string}`,
        { waitForConfirmation: args.waitForConfirmation },
      );
      return `Transfer successful. TxHash: ${result.txHash}. IntentId: ${result.intentId}. Status: ${result.status.status}`;
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        return `Transfer blocked by Mandate policy: ${err.blockReason}`;
      }
      if (err instanceof ApprovalRequiredError) {
        return `Transfer queued for approval. IntentId: ${err.intentId}. ApprovalId: ${err.approvalId}`;
      }
      throw err;
    }
  }

  @CreateAction({
    name: 'mandate_x402_pay',
    description: 'Pay for an x402-gated resource with Mandate policy enforcement.',
    schema: X402PaySchema,
  })
  async x402Pay(walletProvider: WalletProvider, args: X402PayInput): Promise<string> {
    const mandateProvider = walletProvider as MandateWalletProvider;
    const wallet = mandateProvider.getMandateWallet?.();
    if (!wallet) return 'Error: MandateWalletProvider required for x402Pay';

    try {
      const response = await wallet.x402Pay(args.url, { headers: args.headers });
      return `x402 payment successful. HTTP status: ${response.status}`;
    } catch (err) {
      if (err instanceof PolicyBlockedError) {
        return `Payment blocked: ${err.blockReason}`;
      }
      throw err;
    }
  }

  @CreateAction({
    name: 'mandate_get_policy',
    description: 'Get the current Mandate spending policy for this agent wallet.',
    schema: GetPolicySchema,
  })
  async getPolicy(_walletProvider: WalletProvider): Promise<string> {
    return 'Policy info: use the Mandate dashboard at https://app.mandate.md/dashboard to view and configure spending limits.';
  }

  @CreateAction({
    name: 'mandate_get_quota',
    description: 'Get remaining spend quota (daily/monthly) for this agent.',
    schema: GetQuotaSchema,
  })
  async getQuota(_walletProvider: WalletProvider): Promise<string> {
    return 'Quota info: use the Mandate dashboard to view remaining daily/monthly spend quota.';
  }

  supportsNetwork(_network: { protocolFamily: string }): boolean {
    return _network.protocolFamily === 'evm';
  }
}

export const mandateActionProvider = () => new MandateActionProvider();
