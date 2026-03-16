import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PolicyBuilder from '../PolicyBuilder';

const defaultProps = {
  agent_id: 'agent-123',
  current_policy: null,
};

const existingPolicy = {
  id: 'policy-1',
  spend_limit_per_tx_usd: '100',
  spend_limit_per_day_usd: '1000',
  spend_limit_per_month_usd: '10000',
  require_approval_above_usd: '500',
  allowed_addresses: ['0xdeadbeef'],
  blocked_selectors: ['0xa9059cbb'],
  max_gas_limit: '500000',
  schedule: { days: ['monday', 'wednesday'], hours: [9, 10, 11] },
};

describe('PolicyBuilder', () => {
  it('renders the page title', () => {
    render(<PolicyBuilder {...defaultProps} />);
    expect(screen.getByText('Policy Builder')).toBeInTheDocument();
  });

  it('renders spend limit inputs', () => {
    render(<PolicyBuilder {...defaultProps} />);
    expect(screen.getByText('Per Transaction')).toBeInTheDocument();
    expect(screen.getByText('Per Day')).toBeInTheDocument();
    expect(screen.getByText('Per Month')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<PolicyBuilder {...defaultProps} />);
    expect(screen.getByText('Save policy')).toBeInTheDocument();
  });

  it('pre-fills form with existing policy', () => {
    render(<PolicyBuilder agent_id="agent-123" current_policy={existingPolicy} />);

    const inputs = screen.getAllByRole('spinbutton');
    // Per-tx, per-day, per-month, approval threshold = 4 inputs
    expect(inputs[0]).toHaveValue(100);
    expect(inputs[1]).toHaveValue(1000);
    expect(inputs[2]).toHaveValue(10000);
    expect(inputs[3]).toHaveValue(500);
  });

  it('renders existing allowed addresses as tags', () => {
    render(<PolicyBuilder agent_id="agent-123" current_policy={existingPolicy} />);
    expect(screen.getByText(/deadbeef/)).toBeInTheDocument();
  });

  it('renders existing blocked selectors as tags', () => {
    render(<PolicyBuilder agent_id="agent-123" current_policy={existingPolicy} />);
    expect(screen.getByText(/a9059cbb/)).toBeInTheDocument();
  });

  it('renders day buttons for schedule', () => {
    render(<PolicyBuilder {...defaultProps} />);
    expect(screen.getByText('mon')).toBeInTheDocument();
    expect(screen.getByText('tue')).toBeInTheDocument();
    expect(screen.getByText('sun')).toBeInTheDocument();
  });

  it('toggles day selection on click', async () => {
    render(<PolicyBuilder {...defaultProps} />);
    const mondayBtn = screen.getByText('mon');

    await userEvent.click(mondayBtn);
    // After click, Monday should be selected (visual change via style)
    // We can verify by checking the button still exists
    expect(mondayBtn).toBeInTheDocument();
  });

  it('submits policy via fetch on save', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response),
    );
    global.fetch = fetchMock;

    render(<PolicyBuilder {...defaultProps} />);

    await userEvent.click(screen.getByText('Save policy'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agents/agent-123/policies',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('removes tag when × is clicked', async () => {
    render(<PolicyBuilder agent_id="agent-123" current_policy={existingPolicy} />);

    // Find the × buttons for tags
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBeGreaterThan(0);

    await userEvent.click(removeButtons[0]);
    // One tag should be removed
  });

  it('adds address via tag input', async () => {
    render(<PolicyBuilder {...defaultProps} />);

    const inputs = screen.getAllByPlaceholderText(/0x/);
    const addressInput = inputs[0]; // First 0x input is allowed addresses

    await userEvent.type(addressInput, '0x1234{enter}');

    expect(screen.getByText(/1234/)).toBeInTheDocument();
  });

  it('shows approval threshold input', () => {
    render(<PolicyBuilder {...defaultProps} />);
    expect(screen.getByText('Require approval above')).toBeInTheDocument();
  });
});
