import { registerTool } from './tools/registerTool.js';
import { validateTool } from './tools/validateTool.js';
import { statusTool } from './tools/statusTool.js';
import { preflightValidate } from './hook.js';
import { setRuntimeKey, getRuntimeKey } from './keyStore.js';
import type { OpenClawPlugin, OpenClawPluginApi } from './types.js';

const tools = [registerTool, validateTool, statusTool];

const mandatePlugin: OpenClawPlugin & { tools: typeof tools } = {
  id: 'mandate-openclaw-plugin',
  name: 'Mandate',
  version: '1.2.1',
  description: 'Policy gatekeeper for AI agent wallets. AFTER INSTALL: run mandate_register to get your runtimeKey, then mandate_validate before every financial action.',
  configSchema: {
    type: 'object',
    properties: {
      runtimeKey: {
        type: 'string',
        description: 'Mandate runtime key (mndt_live_... or mndt_test_...). Get one via mandate_register tool.',
      },
    },
  },
  register(api: OpenClawPluginApi) {
    // Read runtimeKey from OpenClaw config
    try {
      const cfg = (api as any).config;
      const key = cfg?.plugins?.entries?.['mandate-openclaw-plugin']?.config?.runtimeKey
        ?? cfg?.plugins?.entries?.['openclaw-plugin']?.config?.runtimeKey;
      if (key) setRuntimeKey(key);
    } catch {}

    // Activation check: if no runtimeKey, tell the agent what to do
    if (!getRuntimeKey()) {
      // Use before_prompt_build to inject setup instructions into agent context
      api.on('before_prompt_build', async (event) => {
        if (getRuntimeKey()) return;
        event.pushMessage?.([
          'MANDATE PLUGIN: Not configured yet. You MUST run mandate_register before any financial action.',
          'Call: mandate_register name="YourAgentName" evmAddress="0xYourWalletAddress"',
          'This will return a runtimeKey (saved automatically) and a claimUrl (SHOW IT to the user).',
          'Until registered, all financial actions will be blocked.',
        ].join('\n'));
      }, { priority: 1 });
    }

    api.registerTool(registerTool as any);

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
