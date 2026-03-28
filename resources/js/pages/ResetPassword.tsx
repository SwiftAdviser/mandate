import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

export default function ResetPassword() {
    const { token, email: initialEmail, errors } = usePage<{
        token: string;
        email: string;
        errors: Record<string, string>;
    }>().props;

    const [form, setForm] = useState({
        token,
        email: initialEmail || '',
        password: '',
        password_confirmation: '',
    });
    const [submitting, setSubmitting] = useState(false);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        router.post('/reset-password', form, {
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
                    Set new password
                </h1>
                <p style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: '0 0 24px',
                    lineHeight: 1.5,
                }}>
                    Choose a strong password for your account.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            value={form.email}
                            style={{ ...inputStyle, opacity: 0.6 }}
                            readOnly
                        />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>New password</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            style={inputStyle}
                            placeholder="Min 8 characters"
                            required
                        />
                        {errors?.password && <span style={errorStyle}>{errors.password}</span>}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Confirm password</label>
                        <input
                            type="password"
                            value={form.password_confirmation}
                            onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                            style={inputStyle}
                            required
                        />
                    </div>

                    {errors?.email && (
                        <div style={{
                            padding: '10px 14px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 6,
                            marginBottom: 20,
                            fontSize: 13,
                            color: '#ef4444',
                            fontFamily: 'var(--font-mono)',
                        }}>{errors.email}</div>
                    )}

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
                        {submitting ? 'Resetting...' : 'Reset password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    fontFamily: 'var(--font-mono)',
};

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
