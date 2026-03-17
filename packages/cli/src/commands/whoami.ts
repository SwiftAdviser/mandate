import type { CommandDef } from './types.js';

export const whoamiCommand: CommandDef = {
  description: 'Verify credentials and show agent info',
  async run(c: any) {
    const creds = c.var.credentials;
    const masked = creds.runtimeKey.slice(0, 14) + '...' + creds.runtimeKey.slice(-3);

    return {
      agentId: creds.agentId,
      evmAddress: creds.evmAddress ?? 'not set',
      chainId: creds.chainId ?? 84532,
      keyPrefix: masked,
      baseUrl: creds.baseUrl ?? 'https://app.mandate.md',
    };
  },
};
