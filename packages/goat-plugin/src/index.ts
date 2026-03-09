import { PluginBase } from '@goat-sdk/core';
import type { EVMWalletClient, Chain, ToolBase } from '@goat-sdk/core';
import { TransferTool } from './tools/transfer.js';
import { X402PayTool } from './tools/x402.js';

export interface MandateConfig {
  runtimeKey: string;
  privateKey: `0x${string}`;
  chainId?: number;
  rpcUrl?: string;
}

export class MandatePlugin extends PluginBase<EVMWalletClient> {
  constructor(private config: MandateConfig) {
    super('mandate', []);
  }

  supportsChain(chain: Chain): boolean {
    return chain.type === 'evm';
  }

  getTools(wallet: EVMWalletClient): ToolBase[] {
    return [
      new TransferTool(this.config),
      new X402PayTool(this.config),
    ];
  }
}

export const mandate = (config: MandateConfig) => new MandatePlugin(config);
export type { MandateConfig };
