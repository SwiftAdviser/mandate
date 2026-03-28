import { describe, it, expect } from 'vitest';
import { scanContent, isFileProtected, scanDirectory } from '../scanner.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('scanContent', () => {
  it('detects wallet.sendTransaction as unprotected', () => {
    const content = `const tx = await wallet.sendTransaction({ to, data });`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].protected).toBe(false);
    expect(findings[0].line).toBe(1);
  });

  it('detects wallet.transfer as unprotected', () => {
    const content = `await wallet.transfer(recipient, amount);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].protected).toBe(false);
  });

  it('detects writeContract as unprotected', () => {
    const content = `const hash = await writeContract(config);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
  });

  it('detects wallet.send as unprotected', () => {
    const content = `await wallet.send(tx);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].protected).toBe(false);
  });

  it('detects .sendRawTransaction as unprotected', () => {
    const content = `const hash = await provider.sendRawTransaction(signed);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
  });

  it('detects walletClient.write as unprotected', () => {
    const content = `const hash = await walletClient.writeContract(args);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it('detects execute_swap as unprotected', () => {
    const content = `await execute_swap(params);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
  });

  it('detects execute_trade as unprotected', () => {
    const content = `const result = execute_trade(order);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
  });

  it('detects executeAction with transfer', () => {
    const content = `await executeAction('transfer', { to, amount });`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
  });

  it('returns empty for non-financial code', () => {
    const content = `console.log('hello world');`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(0);
  });

  it('does not false-positive on .send() without wallet context', () => {
    const content = `await email.send(message);`;
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(0);
  });

  it('returns correct line numbers for multi-line content', () => {
    const content = [
      'import { something } from "lib";',
      '',
      'async function main() {',
      '  const tx = await wallet.sendTransaction({ to });',
      '  console.log(tx);',
      '  await writeContract(config);',
      '}',
    ].join('\n');
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(2);
    expect(findings[0].line).toBe(4);
    expect(findings[1].line).toBe(6);
  });

  it('marks findings as protected when file has mandate imports', () => {
    const content = [
      'import { MandateClient } from "@mandate.md/sdk";',
      'const tx = await wallet.sendTransaction({ to });',
    ].join('\n');
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].protected).toBe(true);
  });

  it('detects multiple patterns in one file', () => {
    const content = [
      'await wallet.transfer(to, amount);',
      'await writeContract(config);',
      'execute_swap(params);',
    ].join('\n');
    const findings = scanContent(content, 'test.ts');
    expect(findings).toHaveLength(3);
  });
});

describe('isFileProtected', () => {
  it('returns true when MandateClient is imported', () => {
    const content = `import { MandateClient } from '@mandate.md/sdk';`;
    expect(isFileProtected(content)).toBe(true);
  });

  it('returns true when mandate validate is called', () => {
    const content = `await mandate.validate({ action: 'transfer' });`;
    expect(isFileProtected(content)).toBe(true);
  });

  it('returns true when @mandate package is imported', () => {
    const content = `import { MandateWallet } from '@mandate.md/sdk';`;
    expect(isFileProtected(content)).toBe(true);
  });

  it('returns true when mandate.validate is called', () => {
    const content = `const result = await mandate.validate({ action: 'transfer' });`;
    expect(isFileProtected(content)).toBe(true);
  });

  it('returns true when /api/validate is referenced', () => {
    const content = `const res = await fetch('/api/validate', { method: 'POST' });`;
    expect(isFileProtected(content)).toBe(true);
  });

  it('returns false for unprotected code', () => {
    const content = `await wallet.sendTransaction({ to });`;
    expect(isFileProtected(content)).toBe(false);
  });
});

describe('scanDirectory', () => {
  it('scans a temp directory with test files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mandate-scan-'));

    // Unprotected file
    fs.writeFileSync(
      path.join(tmpDir, 'agent.ts'),
      `await wallet.sendTransaction({ to: '0x123' });\n`
    );

    // Protected file
    fs.writeFileSync(
      path.join(tmpDir, 'safe.ts'),
      [
        'import { MandateClient } from "@mandate.md/sdk";',
        'await wallet.sendTransaction({ to });',
      ].join('\n')
    );

    // Non-matching file
    fs.writeFileSync(
      path.join(tmpDir, 'utils.ts'),
      `export const add = (a: number, b: number) => a + b;\n`
    );

    const result = scanDirectory(tmpDir);

    expect(result.filesScanned).toBe(3);
    expect(result.findings).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.unprotected).toBe(1);
    expect(result.summary.protected).toBe(1);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('skips node_modules directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mandate-scan-'));
    const nmDir = path.join(tmpDir, 'node_modules', 'some-pkg');
    fs.mkdirSync(nmDir, { recursive: true });

    fs.writeFileSync(
      path.join(nmDir, 'index.ts'),
      `await wallet.sendTransaction({ to });\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, 'app.ts'),
      `console.log('clean');\n`
    );

    const result = scanDirectory(tmpDir);
    expect(result.filesScanned).toBe(1);
    expect(result.findings).toHaveLength(0);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('respects custom ignore patterns', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mandate-scan-'));
    const genDir = path.join(tmpDir, 'generated');
    fs.mkdirSync(genDir);

    fs.writeFileSync(
      path.join(genDir, 'auto.ts'),
      `await wallet.sendTransaction({ to });\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, 'main.ts'),
      `await wallet.transfer(to, amt);\n`
    );

    const result = scanDirectory(tmpDir, { ignore: ['generated/'] });
    expect(result.filesScanned).toBe(1);
    expect(result.summary.unprotected).toBe(1);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns correct summary with zero findings', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mandate-scan-'));
    fs.writeFileSync(path.join(tmpDir, 'clean.ts'), `export const x = 1;\n`);

    const result = scanDirectory(tmpDir);
    expect(result.filesScanned).toBe(1);
    expect(result.summary.total).toBe(0);
    expect(result.summary.unprotected).toBe(0);
    expect(result.summary.protected).toBe(0);

    fs.rmSync(tmpDir, { recursive: true });
  });
});
