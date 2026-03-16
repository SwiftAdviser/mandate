export default function Login() {
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

                <a
                    href="/auth/github"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '13px 20px',
                        background: 'var(--amber)',
                        color: '#080c10',
                        border: 'none',
                        borderRadius: 6,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: '-0.01em',
                        textDecoration: 'none',
                        transition: 'opacity 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.opacity = '0.88';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    Sign in with GitHub
                </a>

                <p style={{
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    margin: '20px 0 0',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: 1.6,
                }}>
                    <a href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
                        ← Back to landing
                    </a>
                </p>
            </div>
        </div>
    );
}
