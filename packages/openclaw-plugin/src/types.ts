export interface OpenClawToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: unknown, context?: unknown) => Promise<unknown>;
}

export interface OpenClawHookEvent {
  type: string;
  action: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  conversationContext?: string;
  pushMessage?: (msg: string) => void;
}

export interface OpenClawPluginApi {
  registerTool(tool: OpenClawToolDefinition): void;
  on(event: string, handler: (event: OpenClawHookEvent) => Promise<void>, opts?: { priority?: number }): void;
}

export interface OpenClawPluginConfig {
  runtimeKey?: string;
}

export interface OpenClawPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  configSchema?: Record<string, unknown>;
  register(api: OpenClawPluginApi, config?: OpenClawPluginConfig): void;
}
