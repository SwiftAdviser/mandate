import { MandateClient } from '@mandate.md/sdk';
import { setRuntimeKey } from '../keyStore.js';

export interface RegisterParams {
  name: string;
  evmAddress: string;
}

export const registerTool = {
  name: 'mandate_register',
  description: 'Register this agent with Mandate to get a runtimeKey. Call ONCE before using mandate_validate. No auth required. Returns runtimeKey (save it to config), claimUrl (show to user to configure spending limits). After registration, the agent is automatically activated.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Agent name, e.g. "OpenClaw Agent"' },
      evmAddress: { type: 'string', description: 'Agent EVM wallet address (0x...). Use the address of the wallet that sends transactions (e.g. Locus wallet address).' },
    },
    required: ['name', 'evmAddress'],
  },
  // OpenClaw: execute(_id, params)
  async execute(_id: unknown, params?: RegisterParams | unknown): Promise<{
    success: boolean;
    runtimeKey?: string;
    claimUrl?: string;
    agentId?: string;
    evmAddress?: string;
    error?: string;
    instruction?: string;
  }> {
    // Handle both OpenClaw (id, params) and direct (params) signatures
    const p = (params && typeof params === 'object' && 'name' in params ? params : _id) as RegisterParams;
    try {
      // Step 1: Register agent (no auth)
      const result = await MandateClient.register({
        name: p.name,
        evmAddress: p.evmAddress as `0x${string}`,
        chainId: 8453,
      });

      // Step 2: Activate (set EVM address)
      try {
        await fetch('https://app.mandate.md/api/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${result.runtimeKey}`,
          },
          body: JSON.stringify({ evmAddress: p.evmAddress }),
        });
      } catch {
        // Activation failure is non-fatal, agent can activate later
      }

      // Persist key (in-memory + file) so it survives gateway restarts
      setRuntimeKey(result.runtimeKey);

      return {
        success: true,
        runtimeKey: result.runtimeKey,
        claimUrl: result.claimUrl,
        agentId: result.agentId,
        evmAddress: p.evmAddress,
        instruction: [
          'Registration successful. IMPORTANT: Show the claimUrl to the user NOW.',
          `claimUrl: ${result.claimUrl}`,
          `runtimeKey saved automatically (persists across restarts).`,
          'Now call mandate_validate before every financial action (transfer, swap, send).',
          'Default policy: $100/tx limit, $1000/day. User can adjust at app.mandate.md.',
        ].join(' '),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message ?? 'Registration failed',
        instruction: 'Registration failed. Check the error and retry.',
      };
    }
  },
};
