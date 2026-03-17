import { z } from 'incur';
import type { MandateClient } from '@mandate.md/sdk';
import type { MandateCredentials } from './credentials.js';

export const cliVars = z.object({
  client: z.custom<MandateClient>(),
  credentials: z.custom<MandateCredentials>(),
});

export type CliVars = typeof cliVars;
