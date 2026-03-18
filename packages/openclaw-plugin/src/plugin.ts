import { registerTool } from './tools/registerTool.js';
import { validateTool } from './tools/validateTool.js';
import { statusTool } from './tools/statusTool.js';
import { preflightValidate } from './hook.js';
import type { OpenClawPlugin, OpenClawPluginApi, OpenClawPluginConfig } from './types.js';

const tools = [registerTool, validateTool, statusTool];

const mandatePlugin: OpenClawPlugin & { tools: typeof tools } = {
  id: 'openclaw-plugin',
  name: 'Mandate',
  version: '0.3.2',
  description: 'Policy gatekeeper for AI agent wallets. Flow: 1) mandate_register (once, to get runtimeKey), 2) mandate_validate (before EVERY financial action), 3) if allowed, use your normal wallet (Locus, Bankr, etc.). No private key needed. Also installs a hook that auto-intercepts financial tool calls as a safety net.',
  configSchema: {
    type: 'object',
    properties: {
      runtimeKey: { type: 'string', description: 'Mandate runtime key (mndt_live_... or mndt_test_...). Get one via mandate_register tool.' },
    },
  },
  register(api: OpenClawPluginApi, config?: OpenClawPluginConfig) {
    const runtimeKey = config?.runtimeKey ?? '';

    // Tools: explicit agent flow (register -> validate -> status)
    api.registerTool({
      ...registerTool,
      execute: (params) => registerTool.execute(params as any),
    });

    api.registerTool({
      ...validateTool,
      execute: (params) => validateTool.execute(params as any, config),
    });

    api.registerTool({
      ...statusTool,
      execute: (params) => statusTool.execute(params as any, config),
    });

    // Hook: safety net. Auto-intercepts financial tool calls (Locus, Bankr, swap, transfer, send)
    // even if the agent forgets to call mandate_validate first.
    api.on('message:preprocessed', async (event) => {
      if (!event.toolName) return;
      // Skip our own tools to avoid recursion
      if (event.toolName.startsWith('mandate_')) return;

      const result = await preflightValidate(
        runtimeKey, event.toolName, event.toolInput, event.conversationContext,
      );
      if (!result.allowed) {
        event.pushMessage?.(`\u{1F6AB} Mandate: blocked. ${result.reason}: ${result.declineMessage}`);
      }
      // If allowed: silent. Agent proceeds normally.
    }, { priority: 100 });
  },
  tools,
};

export default mandatePlugin;
export { registerTool, validateTool, statusTool };
