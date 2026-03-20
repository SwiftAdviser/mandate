import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Dashboard from '../Dashboard';

const baseProps = {
  agents: [],
  selected_agent: null,
  daily_quota: null,
  monthly_quota: null,
  daily_limit: null,
  monthly_limit: null,
  recent_intents: [],
  total_confirmed_today: 0,
  pending_approvals: 0,
  needs_onboarding: false,
  first_visit_key: null,
  top_insight: null,
};

const agentProps = {
  ...baseProps,
  selected_agent: {
    id: 'agent-1',
    name: 'TradeBot',
    wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12',
    chain_id: '84532',
    circuit_breaker_active: false,
    claimed_at: '2026-03-01',
  },
  daily_quota: {
    reserved_usd: '50.00',
    confirmed_usd: '100.00',
    limit_usd: '1000.00',
    window_key: '2026-03-16',
  },
  monthly_quota: {
    reserved_usd: '200.00',
    confirmed_usd: '500.00',
    limit_usd: '10000.00',
    window_key: '2026-03',
  },
  total_confirmed_today: 150.75,
  pending_approvals: 3,
};

describe('Dashboard', () => {
  it('renders overview when no agent selected', () => {
    render(<Dashboard {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('renders agent name when selected', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText('TradeBot')).toBeInTheDocument();
  });

  it('shows agent EVM address abbreviated', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText(/0xabcd.*ef12/)).toBeInTheDocument();
  });

  it('shows operational status when circuit breaker inactive', () => {
    render(<Dashboard {...agentProps} />);
    // 'operational' appears both in header status and circuit breaker toggle
    expect(screen.getAllByText('operational').length).toBeGreaterThanOrEqual(1);
  });

  it('shows tripped status when circuit breaker active', () => {
    render(<Dashboard {...{
      ...agentProps,
      selected_agent: { ...agentProps.selected_agent!, circuit_breaker_active: true },
    }} />);
    expect(screen.getByText('tripped')).toBeInTheDocument();
  });

  it('displays confirmed today stat', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText('$150.75')).toBeInTheDocument();
  });

  it('shows pending approvals badge', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText('3 pending approvals')).toBeInTheDocument();
  });

  it('does not show pending approvals link when count is zero', () => {
    render(<Dashboard {...{ ...agentProps, pending_approvals: 0 }} />);
    expect(screen.queryByText(/pending approval/)).not.toBeInTheDocument();
  });

  it('renders circuit breaker toggle', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText('Circuit Breaker')).toBeInTheDocument();
  });

  it('shows empty intents message when no intents', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText(/No intents yet/)).toBeInTheDocument();
  });

  it('renders recent intents table when intents exist', () => {
    const props = {
      ...agentProps,
      recent_intents: [{
        id: 'i1',
        decoded_action: 'transfer',
        amount_usd_computed: '25.00',
        status: 'confirmed',
        to_address: '0x1234567890abcdef1234567890abcdef12345678',
        created_at: new Date().toISOString(),
        tx_hash: '0xabc123',
        risk_level: null,
        summary: 'Transfer 25 USDC to 0x1234...5678',
        reason: 'Test payment',
      }],
    };

    render(<Dashboard {...props} />);
    expect(screen.getByText('Transfer 25 USDC to 0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('shows chain ID', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText('chain 84532')).toBeInTheDocument();
  });

  it('renders quota section', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText('Spend Quota')).toBeInTheDocument();
  });

  it('links to policies page', () => {
    render(<Dashboard {...agentProps} />);
    expect(screen.getByText('Configure spend limits →')).toBeInTheDocument();
  });
});
