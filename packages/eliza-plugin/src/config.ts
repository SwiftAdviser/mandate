export interface MandateElizaConfig {
  runtimeKey: string;
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
}

export function getConfig(runtime: { getSetting: (key: string) => string | null }): MandateElizaConfig {
  const runtimeKey = runtime.getSetting('MANDATE_RUNTIME_KEY') ?? process.env.MANDATE_RUNTIME_KEY ?? '';
  const privateKey = (runtime.getSetting('MANDATE_PRIVATE_KEY') ?? process.env.MANDATE_PRIVATE_KEY ?? '') as `0x${string}`;
  const chainId = Number(runtime.getSetting('MANDATE_CHAIN_ID') ?? process.env.MANDATE_CHAIN_ID ?? '84532');
  return { runtimeKey, privateKey, chainId };
}
