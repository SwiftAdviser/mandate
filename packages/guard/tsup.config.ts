import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { 'scanner/index': 'src/scanner/index.ts' },
    format: ['esm'],
    dts: true,
    clean: true,
    outDir: 'dist',
    external: ['@mandate/sdk'],
  },
  {
    entry: { 'wallet/index': 'src/wallet/index.ts' },
    format: ['esm'],
    dts: true,
    outDir: 'dist',
    external: ['@mandate/sdk'],
  },
  {
    entry: { 'cli/scan': 'cli/scan.ts' },
    format: ['esm'],
    outDir: 'dist',
    external: ['@mandate/sdk'],
    banner: { js: '#!/usr/bin/env node' },
  },
]);
