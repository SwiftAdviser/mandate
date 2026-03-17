import { transferTool } from './tools/transferTool.js';
import { x402Tool } from './tools/x402Tool.js';
import { sendEthTool } from './tools/sendEthTool.js';

const mandatePlugin = {
  name: 'mandate',
  version: '0.2.0',
  description: 'Policy-enforced on-chain actions via Mandate spending limits. Automatically blocks transactions that exceed configured USD limits.',
  tools: [transferTool, x402Tool, sendEthTool],
};

export default mandatePlugin;
export { transferTool, x402Tool, sendEthTool };
