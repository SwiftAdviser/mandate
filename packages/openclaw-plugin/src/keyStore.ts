// Pure in-memory runtime key storage.
// Set by register() from plugin config, or by mandate_register tool.
// No env vars, no file I/O.
let cachedKey = '';

export function setRuntimeKey(key: string): void {
  cachedKey = key;
}

export function getRuntimeKey(): string {
  return cachedKey;
}
