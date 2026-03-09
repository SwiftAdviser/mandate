import type { Plugin } from '@elizaos/core';
import { transferAction } from './actions/transfer.js';
import { x402PayAction } from './actions/x402Pay.js';
import { sendEthAction } from './actions/sendEth.js';
import { walletStateProvider } from './providers/wallet.js';

export const mandatePlugin: Plugin = {
  name: 'mandate',
  description: 'Policy-enforced on-chain actions via Mandate spending limits',
  actions: [transferAction, x402PayAction, sendEthAction],
  providers: [walletStateProvider],
  evaluators: [],
};

export { transferAction, x402PayAction, sendEthAction, walletStateProvider };
export type { MandateElizaConfig } from './config.js';
