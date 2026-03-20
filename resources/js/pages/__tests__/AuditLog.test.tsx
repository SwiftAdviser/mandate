import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import AuditLog from '../AuditLog';
import { router } from '@inertiajs/react';

function makeIntent(overrides = {}) {
  return {
    id: 'intent-1',
    decoded_action: 'transfer',
    amount_usd_computed: '50.00',
    status: 'confirmed',
    to_address: '0xabcdef1234567890abcdef1234567890abcdef12',
    created_at: new Date().toISOString(),
    tx_hash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
    chain_id: '84532',
    intent_hash: '0x' + 'ab'.repeat(32),
    risk_level: null,
    summary: null,
    ...overrides,
  };
}

const defaultProps = {
  intents: { data: [], current_page: 1, last_page: 1 },
  filters: { status: '', action: '' },
};

describe('AuditLog', () => {
  it('renders page title', () => {
    render(<AuditLog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Audit Log' })).toBeInTheDocument();
  });

  it('shows empty state when no intents', () => {
    render(<AuditLog {...defaultProps} />);
    expect(screen.getByText('No intents match your filters.')).toBeInTheDocument();
  });

  it('renders intent row with data', () => {
    render(<AuditLog intents={{ data: [makeIntent()], current_page: 1, last_page: 1 }} filters={{ status: '', action: '' }} />);

    // 'transfer' may appear in filter dropdown too, use table body check
    const table = screen.getByRole('table');
    expect(within(table).getByText('transfer')).toBeInTheDocument();
    expect(within(table).getByText('$50.00')).toBeInTheDocument();
    expect(within(table).getByText('confirmed')).toBeInTheDocument();
    expect(within(table).getByText('84532')).toBeInTheDocument();
  });

  it('shows abbreviated tx hash', () => {
    render(<AuditLog intents={{ data: [makeIntent()], current_page: 1, last_page: 1 }} filters={{ status: '', action: '' }} />);

    // shortAddr format: first 6 chars + … + last 4 chars
    expect(screen.getByText(/0xabc1.*abc1/)).toBeInTheDocument();
  });

  it('shows dash when no tx hash', () => {
    render(<AuditLog
      intents={{ data: [makeIntent({ tx_hash: null })], current_page: 1, last_page: 1 }}
      filters={{ status: '', action: '' }}
    />);

    // '—' dashes for missing values
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders status filter dropdown', () => {
    render(<AuditLog {...defaultProps} />);
    expect(screen.getByText('All statuses')).toBeInTheDocument();
  });

  it('renders action filter dropdown', () => {
    render(<AuditLog {...defaultProps} />);
    expect(screen.getByText('All actions')).toBeInTheDocument();
  });

  it('renders filter button', () => {
    render(<AuditLog {...defaultProps} />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('calls router.get on filter click', async () => {
    render(<AuditLog {...defaultProps} />);

    await userEvent.click(screen.getByText('Filter'));

    expect(router.get).toHaveBeenCalledWith(
      '/audit',
      expect.objectContaining({ status: '', action: '' }),
      expect.any(Object),
    );
  });

  it('renders pagination when multiple pages', () => {
    render(<AuditLog
      intents={{ data: [makeIntent()], current_page: 1, last_page: 3 }}
      filters={{ status: '', action: '' }}
    />);

    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
  });

  it('does not render pagination for single page', () => {
    render(<AuditLog
      intents={{ data: [makeIntent()], current_page: 1, last_page: 1 }}
      filters={{ status: '', action: '' }}
    />);

    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it('renders prev button on page 2+', () => {
    render(<AuditLog
      intents={{ data: [makeIntent()], current_page: 2, last_page: 3 }}
      filters={{ status: '', action: '' }}
    />);

    expect(screen.getByText('← Prev')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
  });

  it('shows risk level badge for non-SAFE intents', () => {
    render(<AuditLog
      intents={{ data: [makeIntent({ risk_level: 'CRITICAL' })], current_page: 1, last_page: 1 }}
      filters={{ status: '', action: '' }}
    />);

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('renders multiple intent rows', () => {
    const intents = [
      makeIntent({ id: 'i1', decoded_action: 'transfer' }),
      makeIntent({ id: 'i2', decoded_action: 'approve' }),
      makeIntent({ id: 'i3', decoded_action: 'swap' }),
    ];

    render(<AuditLog
      intents={{ data: intents, current_page: 1, last_page: 1 }}
      filters={{ status: '', action: '' }}
    />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('transfer')).toBeInTheDocument();
    expect(within(table).getByText('approve')).toBeInTheDocument();
    expect(within(table).getByText('swap')).toBeInTheDocument();
  });
});
