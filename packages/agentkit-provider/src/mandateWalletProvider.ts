import { WalletProvider } from '@coinbase/agentkit';
import { MandateWallet } from '@mandate/sdk';
import type { MandateWalletConfig } from '@mandate/sdk';

/**
 * Mandate WalletProvider for AgentKit.
 * Signing is handled by viem (private key stays local).
 * Every transaction goes through Mandate policy validation before signing.
 */
export class MandateWalletProvider extends WalletProvider {
  private readonly wallet: MandateWallet;
  private readonly config: MandateWalletConfig;

  constructor(config: MandateWalletConfig) {
    super();
    this.config = config;
    this.wallet = new MandateWallet(config);
  }

  getAddress(): string {
    return this.wallet.address;
  }

  getNetwork() {
    return {
      networkId: `eip155:${this.config.chainId}`,
      chainId: String(this.config.chainId),
      protocolFamily: 'evm' as const,
    };
  }

  async signMessage(_message: string): Promise<string> {
    // For direct signing (no policy check needed for plain messages)
    throw new Error('Direct message signing not implemented — use transfer() for transactions');
  }

  async sendTransaction(tx: { to: string; data?: string; value?: bigint }) {
    const result = await this.wallet.sendTransaction(
      tx.to as `0x${string}`,
      (tx.data ?? '0x') as `0x${string}`,
      tx.value?.toString() ?? '0',
    );
    return result.txHash;
  }

  getName(): string {
    return 'MandateWalletProvider';
  }

  /** Expose wallet for use in action providers */
  getMandateWallet(): MandateWallet {
    return this.wallet;
  }
}
