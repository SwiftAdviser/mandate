import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function ForgotPassword() {
    const { errors, flash } = usePage<{
        errors: Record<string, string>;
        flash: { success?: string };
    }>().props;

    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        router.post('/forgot-password', { email }, {
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
                    fontSize: 22,
                    fontWeight: 300,
                    letterSpacing: '-0.03em',
                    margin: '0 0 8px',
                    color: 'var(--text-primary)',
                }}>
                    Reset your password
                </h1>
                <p style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: '0 0 24px',
                    lineHeight: 1.5,
                }}>
                    Enter your email and we'll send you a reset link.
                </p>

                {flash?.success && (
                    <div style={{
                        padding: '10px 14px',
                        background: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        borderRadius: 6,
                        marginBottom: 20,
                        fontSize: 13,
                        color: '#34d399',
                        fontFamily: 'var(--font-mono)',
                    }}>{flash.success}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            marginBottom: 6,
                            fontFamily: 'var(--font-mono)',
                        }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-base)',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                color: 'var(--text-primary)',
                                fontSize: 14,
                                fontFamily: 'var(--font-mono)',
                                outline: 'none',
                                boxSizing: 'border-box' as const,
                            }}
                            placeholder="you@example.com"
                            required
                        />
                        {errors?.email && (
                            <span style={{
                                fontSize: 12,
                                color: '#ef4444',
                                marginTop: 4,
                                display: 'block',
                                fontFamily: 'var(--font-mono)',
                            }}>{errors.email}</span>
                        )}
                    </div>

                    <button type="submit" disabled={submitting} style={{
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
                        opacity: submitting ? 0.7 : 1,
                    }}>
                        {submitting ? 'Sending...' : 'Send reset link'}
                    </button>
                </form>

                <p style={{
                    fontSize: 13,
                    color: 'var(--text-dim)',
                    margin: '20px 0 0',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                }}>
                    <a href="/login" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
                        ← Back to sign in
                    </a>
                </p>
            </div>
        </div>
    );
}
