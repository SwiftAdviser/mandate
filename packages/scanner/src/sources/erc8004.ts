import { SDK } from 'agent0-sdk';

export interface Agent8004 {
  agentId:       string;
  name:          string;
  walletAddress: string;
  mcp?:          string;
  a2a?:          string;
  web?:          string;
  email?:        string;
  chain:         number;
}

// Public RPCs — no auth needed for registry reads
const RPC: Record<number, string> = {
  1:    'https://eth.llamarpc.com',
  8453: 'https://mainnet.base.org',
  137:  'https://polygon.llamarpc.com',
};

export async function fetchRegisteredAgents(chains: number[]): Promise<Agent8004[]> {
  const agents: Agent8004[] = [];

  for (const chainId of chains) {
    const rpcUrl = RPC[chainId];
    if (!rpcUrl) continue;

    try {
      const sdk = new SDK({ chainId, rpcUrl });
      const results = await sdk.searchAgents({ active: true }, { sort: ['updatedAt:desc'] });

      for (const agent of results) {
        if (!agent.walletAddress) continue;
        agents.push({
          agentId:       String(agent.agentId),
          name:          agent.name ?? 'Unnamed',
          walletAddress: agent.walletAddress,
          mcp:           agent.mcp,
          a2a:           agent.a2a,
          web:           agent.web,
          email:         agent.email,
          chain:         chainId,
        });
      }
    } catch {
      // Registry may not be deployed on every chain — skip silently
    }
  }

  return agents;
}
