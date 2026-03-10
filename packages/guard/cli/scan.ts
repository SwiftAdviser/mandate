import { MandateGuard } from '../src/scanner/index.js';

const mode = (process.env['GUARD_MODE'] ?? 'input') as 'input' | 'output';
const text = process.argv.slice(2).join(' ');

if (!text) {
  console.error('Usage: mandate-guard scan "<text>"');
  console.error('       GUARD_MODE=output mandate-guard scan "<text>"');
  process.exit(2);
}

const guard = new MandateGuard();
const result = mode === 'output' ? guard.scanOutput(text) : guard.scanInput(text);

console.log(JSON.stringify(result, null, 2));

if (!result.safe) {
  process.exit(1);
}
