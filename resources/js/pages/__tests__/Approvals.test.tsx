import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Approvals from '../Approvals';

function makeApproval(overrides = {}) {
  return {
    id: 'approval-1',
    status: 'pending',
    expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
    agent: { id: 'agent-1', name: 'TestBot' },
    intent: {
      id: 'intent-1',
      decoded_action: 'transfer',
      to_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      amount_usd_computed: '150.50',
      calldata: '0xa9059cbb',
      chain_id: '84532',
      created_at: new Date().toISOString(),
      risk_level: null,
      risk_degraded: false,
      summary: null,
    },
    ...overrides,
  };
}

describe('Approvals', () => {
  it('renders page title', () => {
    render(<Approvals approvals={{ data: [] }} />);
    expect(screen.getByText('Approval Queue')).toBeInTheDocument();
  });

  it('shows empty state when no approvals', () => {
    render(<Approvals approvals={{ data: [] }} />);
    expect(screen.getByText('All clear.')).toBeInTheDocument();
    expect(screen.getByText('No intents awaiting approval.')).toBeInTheDocument();
  });

  it('renders approval card with agent name', () => {
    render(<Approvals approvals={{ data: [makeApproval()] }} />);
    expect(screen.getByText('TestBot')).toBeInTheDocument();
  });

  it('displays USD amount on card', () => {
    render(<Approvals approvals={{ data: [makeApproval()] }} />);
    expect(screen.getByText('$150.50')).toBeInTheDocument();
  });

  it('displays decoded action', () => {
    render(<Approvals approvals={{ data: [makeApproval()] }} />);
    expect(screen.getByText('transfer')).toBeInTheDocument();
  });

  it('renders approve and reject buttons', () => {
    render(<Approvals approvals={{ data: [makeApproval()] }} />);
    expect(screen.getByText(/Approve/)).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('renders decision note input', () => {
    render(<Approvals approvals={{ data: [makeApproval()] }} />);
    expect(screen.getByPlaceholderText('Decision note to improve rules (optional)')).toBeInTheDocument();
  });

  it('calls fetch on approve click', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response),
    );
    global.fetch = fetchMock;

    render(<Approvals approvals={{ data: [makeApproval()] }} />);

    await userEvent.click(screen.getByText(/Approve/));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/approvals/approval-1/decide',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls fetch on reject click', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response),
    );
    global.fetch = fetchMock;

    render(<Approvals approvals={{ data: [makeApproval()] }} />);

    await userEvent.click(screen.getByText('Reject'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/approvals/approval-1/decide',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('removes card after decision', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response),
    );
    global.fetch = fetchMock;

    render(<Approvals approvals={{ data: [makeApproval()] }} />);

    await userEvent.click(screen.getByText(/Approve/));

    // Wait for async state update
    expect(await screen.findByText('All clear.')).toBeInTheDocument();
  });

  it('renders multiple approval cards', () => {
    const approvals = [
      makeApproval({ id: 'a1', agent: { id: '1', name: 'Bot A' } }),
      makeApproval({ id: 'a2', agent: { id: '2', name: 'Bot B' } }),
    ];

    render(<Approvals approvals={{ data: approvals }} />);
    expect(screen.getByText('Bot A')).toBeInTheDocument();
    expect(screen.getByText('Bot B')).toBeInTheDocument();
  });

  it('shows risk level badge when not SAFE', () => {
    const approval = makeApproval({
      intent: {
        ...makeApproval().intent,
        risk_level: 'HIGH',
      },
    });

    render(<Approvals approvals={{ data: [approval] }} />);
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('shows expiry time', () => {
    render(<Approvals approvals={{ data: [makeApproval()] }} />);
    // Should show "expires in Xm"
    expect(screen.getByText(/expires in/)).toBeInTheDocument();
  });
});
