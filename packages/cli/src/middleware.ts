import { middleware } from 'incur';
import { MandateClient } from '@mandate.md/sdk';
import { loadCredentials } from './credentials.js';
import type { CliVars } from './vars.js';

export const requireAuth = middleware<CliVars>((c, next) => {
  const creds = loadCredentials();
  if (!creds?.runtimeKey) {
    return c.error({ code: 'NOT_AUTHENTICATED', message: 'No credentials. Run: mandate login' });
  }
  c.set('client', new MandateClient({ runtimeKey: creds.runtimeKey, baseUrl: creds.baseUrl }));
  c.set('credentials', creds);
  return next();
});
