import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Bot, Shield, FileText, CheckCircle, Bell, ScrollText, Puzzle } from 'lucide-react';
import { ReactNode, useState } from 'react';

const NAV = [
  { href: '/dashboard',       label: 'Quick Start',   icon: LayoutDashboard },
  { href: '/integrations',    label: 'Integrations',   icon: Puzzle },
  { href: '/mandate',          label: 'MANDATE.md',     icon: FileText, needsAgent: true },
  { href: '/agents',          label: 'Agents',         icon: Bot, needsAgent: true },
  { href: '/policies',        label: 'Policies',       icon: Shield, needsAgent: true },
  { href: '/approvals',       label: 'Approvals',      icon: CheckCircle, badge: true, needsAgent: true },
  { href: '/notifications',   label: 'Notifications',  icon: Bell, needsAgent: true },
  { href: '/audit',           label: 'Audit Log',      icon: ScrollText, needsAgent: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const page = usePage<{ auth: { user: { name: string; avatar_url: string | null } | null }; pending_approvals: number }>();
  const url = page.url;
  const user = (page.props as any).auth?.user;
  const pendingApprovals = (page.props as any).pending_approvals ?? 0;
  const agentActivated = (page.props as any).agent_activated ?? false;
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
          <img src="/logo.png" alt="Mandate" style={{
            width: 28, height: 28, flexShrink: 0,
          }} />
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
          {NAV.filter(item => !item.needsAgent || agentActivated).map(item => {
            const active = url.startsWith(item.href);
            const Icon = item.icon;
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
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  background: active ? 'var(--accent-glow)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent-dim)' : 'transparent'}`,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  textDecoration: 'none',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <span style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
                  <Icon size={16} strokeWidth={1.8} />
                  {item.badge && pendingApprovals > 0 && (
                    <span style={{
                      position: 'absolute', top: -3, right: -4,
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--red)',
                      border: '1.5px solid var(--bg-surface)',
                    }} />
                  )}
                </span>
                {!collapsed && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.label}
                    {item.badge && pendingApprovals > 0 && (
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        background: 'var(--red)', color: '#fff',
                        borderRadius: 8, padding: '0 5px', lineHeight: '16px',
                        fontWeight: 600, minWidth: 16, textAlign: 'center',
                      }}>
                        {pendingApprovals}
                      </span>
                    )}
                  </span>
                )}
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
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000' }}>
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
      <main className="dashboard-main" style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <style>{`.dashboard-main > * { margin-left: auto; margin-right: auto; }`}</style>
        {children}
      </main>
    </div>
  );
}
