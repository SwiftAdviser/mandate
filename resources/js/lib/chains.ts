export interface ChainInfo {
  id: string;
  name: string;
  type: 'evm' | 'solana' | 'ton';
  testnet: boolean;
  explorer: string;
}

export const CHAINS: Record<string, ChainInfo> = {
  '1':        { id: '1',        name: 'Ethereum',      type: 'evm',    testnet: false, explorer: 'https://etherscan.io' },
  '11155111': { id: '11155111', name: 'Sepolia',        type: 'evm',    testnet: true,  explorer: 'https://sepolia.etherscan.io' },
  '8453':     { id: '8453',     name: 'Base',           type: 'evm',    testnet: false, explorer: 'https://basescan.org' },
  '84532':    { id: '84532',    name: 'Base Sepolia',   type: 'evm',    testnet: true,  explorer: 'https://sepolia.basescan.org' },
  'solana':        { id: 'solana',        name: 'Solana',        type: 'solana', testnet: false, explorer: 'https://solscan.io' },
  'solana-devnet': { id: 'solana-devnet', name: 'Solana Devnet', type: 'solana', testnet: true,  explorer: 'https://solscan.io/?cluster=devnet' },
  'ton':           { id: 'ton',           name: 'TON',           type: 'ton',    testnet: false, explorer: 'https://tonviewer.com' },
  'ton-testnet':   { id: 'ton-testnet',   name: 'TON Testnet',  type: 'ton',    testnet: true,  explorer: 'https://testnet.tonviewer.com' },
  '56':            { id: '56',           name: 'BNB Chain',    type: 'evm',    testnet: false, explorer: 'https://bscscan.com' },
  '97':            { id: '97',           name: 'BNB Testnet',  type: 'evm',    testnet: true,  explorer: 'https://testnet.bscscan.com' },
};

export function getChain(chainId: string | number | null | undefined): ChainInfo | null {
  if (chainId == null) return null;
  return CHAINS[String(chainId)] ?? null;
}

export function getChainName(chainId: string | number | null | undefined): string {
  return getChain(chainId)?.name ?? `Chain ${chainId}`;
}

export function explorerTxUrl(chainId: string | number | null | undefined, txHash: string): string | null {
  const chain = getChain(chainId);
  if (!chain) return null;
  const base = chain.explorer.replace(/\/$/, '');
  if (chain.type === 'ton') return `${base}/transaction/${txHash}`;
  return `${base}/tx/${txHash}`;
}
