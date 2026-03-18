import { preflightValidate } from '@mandate/openclaw-plugin';

interface HookEvent {
  toolName?: string;
  toolInput?: Record<string, unknown>;
  conversationContext?: string;
  pushMessage?: (msg: string) => void;
}

export default async function handler(event: HookEvent): Promise<void> {
  if (!event.toolName) return;

  const runtimeKey = process.env.MANDATE_RUNTIME_KEY ?? '';
  const result = await preflightValidate(
    runtimeKey,
    event.toolName,
    event.toolInput,
    event.conversationContext,
  );

  if (!result.allowed) {
    event.pushMessage?.(`\u{1F6AB} Mandate: blocked. ${result.reason}: ${result.declineMessage}`);
  } else {
    event.pushMessage?.(`\u2705 Mandate: policy check passed`);
  }
}
