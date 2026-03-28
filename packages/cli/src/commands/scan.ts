import { z } from 'incur';
import * as path from 'node:path';
import type { CommandDef } from './types.js';
import { scanDirectory, type Finding } from '../scanner.js';

export const scanCommand: CommandDef = {
  description: 'Scan codebase for unprotected wallet/financial calls',
  args: z.tuple([z.string().describe('Directory to scan').default('.')]).optional(),
  options: z.object({
    json: z.boolean().optional().describe('Output as JSON'),
    verbose: z.boolean().optional().describe('Show all findings including protected'),
    ignore: z.string().optional().describe('Comma-separated glob patterns to ignore'),
    'no-telemetry': z.boolean().optional().describe('Disable anonymous scan telemetry'),
  }),
  async run(c: any) {
    const dir = c.args?.[0] ?? process.cwd();
    const opts = c.options;

    const ignoreList = opts.ignore?.split(',').map((s: string) => s.trim()) ?? [];
    const result = scanDirectory(dir, { ignore: ignoreList });

    // Silent telemetry ping (fire-and-forget)
    if (!opts['no-telemetry']) {
      fetch('https://app.mandate.md/api/scan-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filesScanned: result.filesScanned,
          unprotected: result.summary.unprotected,
          ts: Date.now(),
        }),
      }).catch(() => {}); // fire-and-forget
    }

    if (opts.json) {
      return { ...result, version: '0.2.0' };
    }

    // Human-readable output
    const lines: string[] = ['', '  Mandate Scan v0.2.0', ''];
    lines.push(`  Scanning ${dir} ...`, '');

    // Group findings by file
    const byFile = new Map<string, Finding[]>();
    for (const f of result.findings) {
      if (!opts.verbose && f.protected) continue;
      const arr = byFile.get(f.file) ?? [];
      arr.push(f);
      byFile.set(f.file, arr);
    }

    for (const [file, findings] of byFile) {
      lines.push(`    ${file}`);
      for (const f of findings) {
        const status = f.protected ? 'PROTECTED' : 'UNPROTECTED';
        lines.push(`      L${f.line}  ${f.match.trim().slice(0, 50)}  ${status}`);
      }
      lines.push('');
    }

    const { unprotected, total } = result.summary;
    if (unprotected > 0) {
      lines.push(`  ${unprotected} unprotected call${unprotected > 1 ? 's' : ''} found across ${result.filesScanned} files.`);
      lines.push('  Fix: https://mandate.md/docs/quickstart');
    } else if (total > 0) {
      lines.push(`  All ${total} financial call${total > 1 ? 's' : ''} are protected. Clean.`);
    } else {
      lines.push('  No financial calls detected.');
    }
    lines.push('');

    return {
      output: lines.join('\n'),
      exitCode: unprotected > 0 ? 1 : 0,
    };
  },
};
