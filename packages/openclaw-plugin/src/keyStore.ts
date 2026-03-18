// Module-level runtime key storage. Set by register() or mandate_register tool.
let storedKey = '';

export function setRuntimeKey(key: string): void {
  if (key) storedKey = key;
}

export function getRuntimeKey(): string {
  return storedKey;
}
