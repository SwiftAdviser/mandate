import { registerTool } from './tools/registerTool.js';
import { validateTool } from './tools/validateTool.js';
import { statusTool } from './tools/statusTool.js';
import { preflightValidate } from './hook.js';
import { setRuntimeKey, getRuntimeKey } from './keyStore.js';
import type { OpenClawPlugin, OpenClawPluginApi } from './types.js';

const tools = [registerTool, validateTool, statusTool];

const mandatePlugin: OpenClawPlugin & { tools: typeof tools } = {
  id: 'openclaw-plugin',
  name: 'Mandate',
  version: '0.5.8',
  description: 'Policy gatekeeper for AI agent wallets. Flow: 1) mandate_register (once, to get runtimeKey), 2) mandate_validate (before EVERY financial action), 3) if allowed, use your normal wallet (Locus, Bankr, etc.).',
  configSchema: {
    type: 'object',
    properties: {
      runtimeKey: {
        type: 'string',
        description: 'Mandate runtime key (mndt_live_... or mndt_test_...).',
      },
    },
  },
  register(api: OpenClawPluginApi) {
    // Read runtimeKey from OpenClaw config
    try {
      const cfg = (api as any).config;
      const key = cfg?.plugins?.entries?.['openclaw-plugin']?.config?.runtimeKey;
      if (key) setRuntimeKey(key);
    } catch {}

    api.registerTool({
      ...registerTool,
      execute: async (_id: unknown, params: unknown) => {
        const result = await registerTool.execute(_id, params);
        if (result.success && result.runtimeKey) {
          setRuntimeKey(result.runtimeKey);
        }
        return result;
      },
    });

    api.registerTool(validateTool as any);
    api.registerTool(statusTool as any);

    api.on('message:preprocessed', async (event) => {
      if (!event.toolName) return;
      if (event.toolName.startsWith('mandate_')) return;
      const result = await preflightValidate(
        getRuntimeKey(), event.toolName, event.toolInput, event.conversationContext,
      );
      if (!result.allowed) {
        event.pushMessage?.(`\u{1F6AB} Mandate: blocked. ${result.reason}: ${result.declineMessage}`);
      }
    }, { priority: 100 });
  },
  tools,
};

export default mandatePlugin;
export { registerTool, validateTool, statusTool, setRuntimeKey, getRuntimeKey };
