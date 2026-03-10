import { MandateGuard } from '@mandate/guard';

const guard = new MandateGuard();

export function scanHandler(
  text: string,
  mode: 'input' | 'output',
): { content: Array<{ type: 'text'; text: string }> } {
  const result = mode === 'output' ? guard.scanOutput(text) : guard.scanInput(text);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
