import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function VerifyEmail() {
    const { flash } = usePage<{ flash: { success?: string } }>().props;
    const [submitting, setSubmitting] = useState(false);

    function resend() {
        setSubmitting(true);
        router.post('/email/verification-notification', {}, {
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
                textAlign: 'center',
            }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 300,
                    letterSpacing: '-0.03em',
                    margin: '0 0 12px',
                    color: 'var(--text-primary)',
                }}>
                    Check your email
                </h1>
                <p style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: '0 0 24px',
                    lineHeight: 1.6,
                }}>
                    We sent a verification link to your email address.
                    Click the link to activate your account.
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

                <button
                    onClick={resend}
                    disabled={submitting}
                    style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: submitting ? 0.7 : 1,
                    }}
                >
                    {submitting ? 'Sending...' : 'Resend verification email'}
                </button>
            </div>
        </div>
    );
}
