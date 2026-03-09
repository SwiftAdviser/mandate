import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { MandateWallet } from '@mandate/sdk';
import { getConfig } from '../config.js';

export const walletStateProvider: Provider = {
  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> => {
    try {
      const config = getConfig(runtime);
      if (!config.runtimeKey || !config.privateKey) {
        return 'Mandate wallet: not configured (set MANDATE_RUNTIME_KEY and MANDATE_PRIVATE_KEY)';
      }
      const wallet = new MandateWallet(config);
      return `Mandate wallet: ${wallet.address} on chain ${config.chainId}. Policy enforcement: active.`;
    } catch {
      return 'Mandate wallet: error loading configuration';
    }
  },
};
