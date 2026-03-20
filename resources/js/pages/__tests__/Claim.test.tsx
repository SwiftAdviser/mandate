import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Claim from '../Claim';

const defaultProps = {
  claim_code: 'ABC123',
  agent_name: 'TradeBot',
  wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12',
  chain_id: '84532',
  already_claimed: false,
};

describe('Claim', () => {
  it('renders agent name', () => {
    render(<Claim {...defaultProps} />);
    expect(screen.getByText('TradeBot')).toBeInTheDocument();
  });

  it('shows claim code', () => {
    render(<Claim {...defaultProps} />);
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('shows chain ID', () => {
    render(<Claim {...defaultProps} />);
    expect(screen.getByText('84532')).toBeInTheDocument();
  });

  it('shows abbreviated EVM address', () => {
    render(<Claim {...defaultProps} />);
    expect(screen.getByText(/0xabcdef12…cdef12/)).toBeInTheDocument();
  });

  it('renders claim button', () => {
    render(<Claim {...defaultProps} />);
    expect(screen.getByText('Claim agent')).toBeInTheDocument();
  });

  it('explains that private key never leaves', () => {
    render(<Claim {...defaultProps} />);
    expect(screen.getByText(/never/)).toBeInTheDocument();
  });

  it('shows already claimed state', () => {
    render(<Claim {...{ ...defaultProps, already_claimed: true }} />);
    expect(screen.getByText('already claimed')).toBeInTheDocument();
    expect(screen.getByText(/already been linked/)).toBeInTheDocument();
    expect(screen.queryByText('Claim agent')).not.toBeInTheDocument();
  });

  it('calls fetch on claim click', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response),
    );
    global.fetch = fetchMock;

    render(<Claim {...defaultProps} />);
    await userEvent.click(screen.getByText('Claim agent'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agents/claim',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows success state after claiming', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response),
    );

    render(<Claim {...defaultProps} />);
    await userEvent.click(screen.getByText('Claim agent'));

    expect(await screen.findByText('Agent claimed.')).toBeInTheDocument();
    expect(screen.getByText('Go to dashboard →')).toBeInTheDocument();
  });

  it('shows error message on failed claim', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Agent already claimed' }),
      } as unknown as Response),
    );

    render(<Claim {...defaultProps} />);
    await userEvent.click(screen.getByText('Claim agent'));

    expect(await screen.findByText('Agent already claimed')).toBeInTheDocument();
  });

  it('shows mandate branding', () => {
    render(<Claim {...defaultProps} />);
    expect(screen.getByText('mandate')).toBeInTheDocument();
    expect(screen.getByText('agent claim')).toBeInTheDocument();
  });
});
