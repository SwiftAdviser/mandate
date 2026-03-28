import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Finding {
  file: string;
  line: number;
  pattern: string;
  match: string;
  protected: boolean;
}

export interface ScanResult {
  filesScanned: number;
  findings: Finding[];
  summary: { total: number; protected: number; unprotected: number };
}

const FINANCIAL_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /wallet\.transfer\(/, label: 'wallet.transfer(' },
  { regex: /wallet\.sendTransaction\(/, label: 'wallet.sendTransaction(' },
  { regex: /wallet\.send\(/, label: 'wallet.send(' },
  { regex: /\.sendTransaction\(/, label: '.sendTransaction(' },
  { regex: /\.sendRawTransaction\(/, label: '.sendRawTransaction(' },
  { regex: /writeContract\(/, label: 'writeContract(' },
  { regex: /walletClient\.write/, label: 'walletClient.write' },
  { regex: /executeAction\(.*transfer/, label: 'executeAction(...transfer)' },
  { regex: /execute_swap/, label: 'execute_swap' },
  { regex: /execute_trade/, label: 'execute_trade' },
];

const FILE_PROTECTION_PATTERNS: RegExp[] = [
  /from\s+['"]@mandate/,
  /require\(['"].*mandate/,
  /MandateClient/,
  /MandateWallet/,
  /mandate\.validate/,
  /mandate\.preflight/,
  /\/api\/validate/,
];

const DEFAULT_SKIP_DIRS = ['node_modules', 'dist', '.git', 'build'];
const SCAN_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx']);

/**
 * Check if a project has Mandate at the infrastructure level:
 * SDK in dependencies, MANDATE.md config, or .mandate/ directory.
 */
export function isProjectProtected(dir: string): boolean {
  // Check root package.json
  try {
    const pkg = fs.readFileSync(path.join(dir, 'package.json'), 'utf-8');
    if (/"@mandate\.md\/sdk"|"@mandate\/sdk"/.test(pkg)) return true;
  } catch {}

  // Check workspace package.json files (max depth 3)
  try {
    const checkPkg = (d: string, depth: number): boolean => {
      if (depth > 3) return false;
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        if (e.isFile() && e.name === 'package.json' && d !== dir) {
          const content = fs.readFileSync(path.join(d, e.name), 'utf-8');
          if (/"@mandate\.md\/sdk"|"@mandate\/sdk"/.test(content)) return true;
        }
        if (e.isDirectory()) {
          if (checkPkg(path.join(d, e.name), depth + 1)) return true;
        }
      }
      return false;
    };
    if (checkPkg(dir, 0)) return true;
  } catch {}

  // Check for MANDATE.md or .mandate/ config
  try {
    if (fs.existsSync(path.join(dir, 'MANDATE.md'))) return true;
    if (fs.existsSync(path.join(dir, '.mandate'))) return true;
  } catch {}

  return false;
}

export function isFileProtected(content: string): boolean {
  return FILE_PROTECTION_PATTERNS.some((p) => p.test(content));
}

export function scanContent(content: string, filePath: string): Finding[] {
  const lines = content.split('\n');
  const fileProtected = isFileProtected(content);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { regex, label } of FINANCIAL_PATTERNS) {
      if (regex.test(line)) {
        findings.push({
          file: filePath,
          line: i + 1,
          pattern: label,
          match: line,
          protected: fileProtected,
        });
        break; // one finding per line
      }
    }
  }

  return findings;
}

function walkDir(
  dir: string,
  skipDirs: string[],
  files: string[]
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirs.some((s) => entry.name === s || fullPath.includes(`/${s}/`) || fullPath.includes(`\\${s}\\`))) {
        continue;
      }
      walkDir(fullPath, skipDirs, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }
}

export function scanDirectory(
  dir: string,
  opts?: { ignore?: string[] }
): ScanResult {
  const skipDirs = [...DEFAULT_SKIP_DIRS];
  if (opts?.ignore) {
    for (const pattern of opts.ignore) {
      skipDirs.push(pattern.replace(/\/+$/, ''));
    }
  }

  const projectProtected = isProjectProtected(dir);

  const files: string[] = [];
  walkDir(dir, skipDirs, files);

  const allFindings: Finding[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const findings = scanContent(content, file);
    // If project has Mandate SDK installed, mark all findings as protected
    if (projectProtected) {
      for (const f of findings) f.protected = true;
    }
    allFindings.push(...findings);
  }

  const protectedCount = allFindings.filter((f) => f.protected).length;
  const unprotectedCount = allFindings.filter((f) => !f.protected).length;

  return {
    filesScanned: files.length,
    findings: allFindings,
    summary: {
      total: allFindings.length,
      protected: protectedCount,
      unprotected: unprotectedCount,
    },
  };
}
