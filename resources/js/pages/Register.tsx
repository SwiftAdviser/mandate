import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function Register() {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;

    const [showEmail, setShowEmail] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', password: '', password_confirmation: '',
    });
    const [submitting, setSubmitting] = useState(false);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        router.post('/register', form, {
            onFinish: () => setSubmitting(false),
        });
    }

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
            <a href="/" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                textDecoration: 'none',
                marginBottom: 48,
            }}>
                <img src="/logo.png" alt="Mandate" style={{ width: 36, height: 36 }} />
                <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.04em',
                }}>mandate</span>
            </a>

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
                    Create your account
                </h1>
                <p style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: '0 0 28px',
                    lineHeight: 1.5,
                }}>
                    Start managing your agent wallets with Mandate.
                </p>

                {/* OAuth buttons (primary) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <a href="/auth/google" style={oauthBtnStyle}>
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </a>
                    <a href="/auth/github" style={oauthBtnStyle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        Continue with GitHub
                    </a>
                </div>

                {/* Email toggle / form */}
                {!showEmail ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>or</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                        <button
                            onClick={() => setShowEmail(true)}
                            style={{
                                width: '100%',
                                padding: '11px 16px',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                color: 'var(--text-secondary)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            Sign up with email
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>or sign up with email</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 14 }}>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Name"
                                    required
                                />
                                {errors?.name && <span style={errorStyle}>{errors.name}</span>}
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Email"
                                    required
                                />
                                {errors?.email && <span style={errorStyle}>{errors.email}</span>}
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Password (min 8 characters)"
                                    required
                                />
                                {errors?.password && <span style={errorStyle}>{errors.password}</span>}
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <input
                                    type="password"
                                    value={form.password_confirmation}
                                    onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                                    style={inputStyle}
                                    placeholder="Confirm password"
                                    required
                                />
                            </div>
                            <button type="submit" disabled={submitting} style={{
                                ...primaryBtnStyle,
                                opacity: submitting ? 0.7 : 1,
                            }}>
                                {submitting ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>
                    </>
                )}

                <p style={{
                    fontSize: 13,
                    color: 'var(--text-dim)',
                    margin: '24px 0 0',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                }}>
                    Already have an account?{' '}
                    <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</a>
                </p>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    display: 'block',
    fontFamily: 'var(--font-mono)',
};

const primaryBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px 20px',
    background: 'var(--accent)',
    color: '#09090b',
    border: 'none',
    borderRadius: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '-0.01em',
};

const oauthBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '13px 20px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
};
