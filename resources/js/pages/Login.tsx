import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

export default function Login() {
    const { ready, authenticated, login, getAccessToken } = usePrivy();
    const [redirecting, setRedirecting] = useState(false);

    // After Privy auth, get JWT → store in cookie → redirect to dashboard
    useEffect(() => {
        if (!ready || !authenticated) return;

        setRedirecting(true);
        getAccessToken().then((token) => {
            if (token) {
                // Store token in cookie (30 min expiry, same path)
                const expires = new Date(Date.now() + 30 * 60 * 1000).toUTCString();
                document.cookie = `privy-token=${token}; path=/; expires=${expires}; SameSite=Lax`;
            }
            window.location.href = '/dashboard';
        });
    }, [ready, authenticated]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-base)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
        }}>
            {/* Logo */}
            <a href="/" style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 300,
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                letterSpacing: '-0.04em',
                marginBottom: 48,
            }}>
                mandate
            </a>

            {/* Card */}
            <div style={{
                width: '100%',
                maxWidth: 400,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '36px 32px',
            }}>
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 26,
                    fontWeight: 300,
                    letterSpacing: '-0.03em',
                    margin: '0 0 8px',
                    color: 'var(--text-primary)',
                }}>
                    Sign in to Mandate
                </h1>
                <p style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: '0 0 32px',
                    lineHeight: 1.5,
                }}>
                    Manage your agent policies, approvals, and audit log.
                </p>

                {redirecting ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: 'var(--text-secondary)',
                        fontSize: 14,
                        fontFamily: 'var(--font-mono)',
                    }}>
                        <span className="pulse-amber" style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--amber)', display: 'inline-block',
                        }} />
                        Redirecting to dashboard…
                    </div>
                ) : (
                    <button
                        onClick={login}
                        disabled={!ready}
                        style={{
                            width: '100%',
                            padding: '13px 20px',
                            background: !ready ? 'var(--bg-raised)' : 'var(--amber)',
                            color: !ready ? 'var(--text-dim)' : '#080c10',
                            border: 'none',
                            borderRadius: 6,
                            fontFamily: 'var(--font-mono)',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: !ready ? 'not-allowed' : 'pointer',
                            letterSpacing: '-0.01em',
                            transition: 'opacity 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={e => {
                            if (ready) {
                                e.currentTarget.style.opacity = '0.88';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {!ready ? 'Loading…' : 'Continue →'}
                    </button>
                )}

                <p style={{
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    margin: '20px 0 0',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: 1.6,
                }}>
                    Email · Wallet · Google
                    <br />
                    <a href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
                        ← Back to landing
                    </a>
                </p>
            </div>
        </div>
    );
}
