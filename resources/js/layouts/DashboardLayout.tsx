import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState } from 'react';

const NAV = [
  { href: '/dashboard',       label: 'Overview',      icon: '◈' },
  { href: '/agents',          label: 'Agents',         icon: '⬡' },
  { href: '/policies',        label: 'Policies',       icon: '⊞' },
  { href: '/approvals',       label: 'Approvals',      icon: '◎', badge: true },
  { href: '/notifications',   label: 'Notifications',  icon: '⊘' },
  { href: '/audit',           label: 'Audit Log',      icon: '≡' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const page = usePage<{ auth: { user: { name: string; avatar_url: string | null } | null } }>();
  const url = page.url;
  const user = (page.props as any).auth?.user;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 220,
        minHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-dim)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 14px' : '20px 20px',
          borderBottom: '1px solid var(--border-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#000', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)' }}>M</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                mandate
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>
                policy layer
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
          {NAV.map(item => {
            const active = url.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '9px 10px' : '9px 12px',
                  borderRadius: 6,
                  marginBottom: 2,
                  color: active ? 'var(--amber)' : 'var(--text-secondary)',
                  background: active ? 'var(--amber-glow)' : 'transparent',
                  border: `1px solid ${active ? 'var(--amber-dim)' : 'transparent'}`,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid var(--border-dim)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              overflow: 'hidden',
            }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000' }}>
                  {user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              {!collapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <form method="POST" action="/logout" style={{ margin: 0 }}>
                    <input type="hidden" name="_token" value={document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''} />
                    <button type="submit" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
                      sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
            }}
          >
            {collapsed ? '→' : '← collapse'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
