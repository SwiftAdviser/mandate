export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatUsd(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

export function shortAddr(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function riskColor(level: string | null | undefined): string {
  switch (level) {
    case 'CRITICAL': return 'var(--red)';
    case 'HIGH':     return '#f97316';
    case 'MEDIUM':   return 'var(--accent)';
    case 'LOW':      return 'var(--green)';
    case 'SAFE':     return 'var(--text-dim)';
    default:         return 'var(--text-dim)';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'confirmed':        return 'var(--green)';
    case 'broadcasted':      return 'var(--blue)';
    case 'reserved':         return 'var(--accent)';
    case 'approval_pending': return 'var(--accent)';
    case 'approved':         return 'var(--blue)';
    case 'preflight':        return 'var(--blue)';
    case 'failed':           return 'var(--red)';
    case 'rejected':         return 'var(--red)';
    case 'expired':          return 'var(--text-dim)';
    default:                 return 'var(--text-secondary)';
  }
}
