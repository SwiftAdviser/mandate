import { getChain } from '@/lib/chains';

interface Props {
  chainId: string | number | null | undefined;
  className?: string;
}

const TYPE_COLORS: Record<string, string> = {
  evm: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  solana: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  ton: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

export default function ChainBadge({ chainId, className = '' }: Props) {
  const chain = getChain(chainId);

  if (!chain) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/50 px-2 py-0.5 text-xs font-medium text-zinc-400 ${className}`}>
        {chainId ? `Chain ${chainId}` : 'Unknown'}
      </span>
    );
  }

  const colorClass = TYPE_COLORS[chain.type] ?? TYPE_COLORS.evm;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass} ${className}`}>
      {chain.name}
      {chain.testnet && (
        <span className="ml-0.5 rounded bg-yellow-500/20 px-1 text-[10px] text-yellow-400">test</span>
      )}
    </span>
  );
}
