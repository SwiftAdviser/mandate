import { Cli } from 'incur';
import { cliVars } from './vars.js';
import { requireAuth } from './middleware.js';
import { loginCommand } from './commands/login.js';
import { activateCommand } from './commands/activate.js';
import { whoamiCommand } from './commands/whoami.js';
import { validateCommand } from './commands/validate.js';
import { transferCommand } from './commands/transfer.js';
import { eventCommand } from './commands/event.js';
import { statusCommand } from './commands/status.js';
import { approveCommand } from './commands/approve.js';

export type { CliVars } from './vars.js';

const cli = Cli.create('mandate', {
  version: '0.1.0',
  description: 'Non-custodial agent wallet policy layer. Validate transactions against spend limits, allowlists, and approval workflows — without ever touching private keys.',
  vars: cliVars,
  sync: {
    suggestions: [
      'register a new agent with mandate login',
      'validate a transaction before signing',
      'check intent status after broadcasting',
    ],
  },
})
  .command('login', {
    ...loginCommand,
  })
  .command('activate', {
    ...activateCommand,
    middleware: [requireAuth],
  })
  .command('whoami', {
    ...whoamiCommand,
    middleware: [requireAuth],
  })
  .command('validate', {
    ...validateCommand,
    middleware: [requireAuth],
  })
  .command('transfer', {
    ...transferCommand,
    middleware: [requireAuth],
  })
  .command('event', {
    ...eventCommand,
    middleware: [requireAuth],
  })
  .command('status', {
    ...statusCommand,
    middleware: [requireAuth],
  })
  .command('approve', {
    ...approveCommand,
    middleware: [requireAuth],
  });

cli.serve();

export default cli;
