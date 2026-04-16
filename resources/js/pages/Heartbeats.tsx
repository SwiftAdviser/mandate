import DashboardLayout from '@/layouts/DashboardLayout';
import { Activity } from 'lucide-react';

interface DailyCount {
  date: string;
  total: number;
  unique_agents: number;
  keyed: number;
  anonymous: number;
}

interface TopAgent {
  agent_id: string;
  agent_name: string;
  count_this_week: number;
  last_seen: string;
}

interface Totals {
  today: number;
  keyed_today: number;
  anonymous_today: number;
  week: number;
  month: number;
}

interface Props {
  daily_counts: DailyCount[];
  totals: Totals;
  top_agents: TopAgent[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-dim)',
      borderRadius: 12,
      padding: '20px 24px',
      flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
        {value.toLocaleString()}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function DailyGrid({ data }: { data: DailyCount[] }) {
  if (data.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '20px 0' }}>
        No heartbeat data yet.
      </div>
    );
  }

  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120, padding: '8px 0' }}>
      {data.map(d => {
        const height = Math.max((d.total / maxTotal) * 100, 2);
        const keyedPct = d.total > 0 ? d.keyed / d.total : 0;
        return (
          <div
            key={d.date}
            title={`${d.date}: ${d.total} total (${d.keyed} keyed, ${d.anonymous} anon, ${d.unique_agents} unique)`}
            style={{
              flex: 1,
              minWidth: 4,
              height: `${height}%`,
              borderRadius: '3px 3px 0 0',
              background: `linear-gradient(to top, var(--accent) ${keyedPct * 100}%, var(--accent-dim) ${keyedPct * 100}%)`,
              cursor: 'default',
              transition: 'opacity 0.15s',
            }}
          />
        );
      })}
    </div>
  );
}

export default function Heartbeats({ daily_counts, totals, top_agents }: Props) {
  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 960 }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Activity size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.03em', margin: 0 }}>
              Skill Heartbeats
            </h1>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>
            Every SKILL.md fetch logs a heartbeat. Track agent adoption and activity.
          </p>
        </div>

        {/* Stat cards */}
        <div className="fade-up" style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard label="Today" value={totals.today} sub={`${totals.keyed_today} keyed / ${totals.anonymous_today} anon`} />
          <StatCard label="This Week" value={totals.week} />
          <StatCard label="This Month" value={totals.month} />
        </div>

        {/* Daily chart */}
        <div className="fade-up" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 28,
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Last 30 Days</div>
          <DailyGrid data={daily_counts} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
              Keyed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-dim)', display: 'inline-block' }} />
              Anonymous
            </span>
          </div>
        </div>

        {/* Top agents */}
        <div className="fade-up" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 12,
          padding: '20px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Top Agents This Week</div>
          {top_agents.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No keyed heartbeats this week.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-dim)', fontWeight: 400, fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agent</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-dim)', fontWeight: 400, fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Heartbeats</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-dim)', fontWeight: 400, fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {top_agents.map(a => (
                  <tr key={a.agent_id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-primary)' }}>{a.agent_name}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{a.count_this_week}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--text-dim)' }}>{timeAgo(a.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
