/** Shared type for command definitions to avoid circular imports */
export type CommandDef = {
  description: string;
  args?: any;
  options?: any;
  alias?: Record<string, string>;
  middleware?: any[];
  examples?: any[];
  run: (c: any) => any;
};
