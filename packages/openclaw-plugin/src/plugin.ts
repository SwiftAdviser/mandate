import { registerTool } from './tools/registerTool.js';
import { validateTool } from './tools/validateTool.js';
import { statusTool } from './tools/statusTool.js';
import { preflightValidate } from './hook.js';
import type { OpenClawPlugin, OpenClawPluginApi, OpenClawPluginConfig } from './types.js';

// In-memory key store. Set by mandate_register, read by mandate_validate/status/hook.
let storedRuntimeKey = '';

export function setRuntimeKey(key: string): void {
  storedRuntimeKey = key;
}

export function getRuntimeKey(config?: OpenClawPluginConfig): string {
  return config?.runtimeKey ?? storedRuntimeKey;
}

const tools = [registerTool, validateTool, statusTool];

const mandatePlugin: OpenClawPlugin & { tools: typeof tools } = {
  id: 'openclaw-plugin',
  name: 'Mandate',
  version: '0.4.5',
  description: 'Policy gatekeeper for AI agent wallets. Flow: 1) mandate_register (once, to get runtimeKey), 2) mandate_validate (before EVERY financial action), 3) if allowed, use your normal wallet (Locus, Bankr, etc.). No private key needed. Also installs a hook that auto-intercepts financial tool calls as a safety net.',
  register(api: OpenClawPluginApi, config?: OpenClawPluginConfig) {
    // Tools: explicit agent flow (register -> validate -> status)
    api.registerTool({
      ...registerTool,
      execute: async (params) => {
        const result = await registerTool.execute(params as any);
        if (result.success && result.runtimeKey) {
          setRuntimeKey(result.runtimeKey);
        }
        return result;
      },
    });

    api.registerTool({
      ...validateTool,
      execute: (params) => validateTool.execute(params as any, { runtimeKey: getRuntimeKey(config) }),
    });

    api.registerTool({
      ...statusTool,
      execute: (params) => statusTool.execute(params as any, { runtimeKey: getRuntimeKey(config) }),
    });

    // Hook: safety net. Auto-intercepts financial tool calls even if agent forgets mandate_validate.
    api.on('message:preprocessed', async (event) => {
      if (!event.toolName) return;
      if (event.toolName.startsWith('mandate_')) return;

      const key = getRuntimeKey(config);
      const result = await preflightValidate(
        key, event.toolName, event.toolInput, event.conversationContext,
      );
      if (!result.allowed) {
        event.pushMessage?.(`\u{1F6AB} Mandate: blocked. ${result.reason}: ${result.declineMessage}`);
      }
    }, { priority: 100 });
  },
  tools,
};

export default mandatePlugin;
export { registerTool, validateTool, statusTool };
