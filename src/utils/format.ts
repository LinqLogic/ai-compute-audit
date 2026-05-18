/** '$12,345' or '$318.42' with optional decimal places. */
export function fmt$(n: number, decimals = 0): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** '$12.3K' for amounts ≥ $1,000; '$999' for smaller. */
export function fmtK$(n: number): string {
  return n >= 1_000 ? '$' + (n / 1_000).toFixed(1) + 'K' : fmt$(n);
}

/** '+25.5%' or '-3.2%'. Pass decimals=0 for integer display (e.g. '+18%'). */
export function fmtPct(n: number, decimals = 1): string {
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
}

/**
 * Executive-safe variance display — caps at 500%.
 * Above that, switches to multiplier language to avoid uninformative strings
 * like '+224,965%'. Examples: '+45.0%', '~23× above benchmark'.
 */
export function fmtVariance(variancePct: number): string {
  if (!isFinite(variancePct) || variancePct < 0) return 'N/A';
  if (variancePct > 500) {
    const times = Math.round(variancePct / 100 + 1);
    return `~${times.toLocaleString('en-US')}× above benchmark`;
  }
  return fmtPct(variancePct);
}

export function riskColor(score: number): string {
  if (score > 70) return '#ef4444';
  if (score > 40) return '#f59e0b';
  return '#22c55e';
}

export function policyBadgeClass(policy: string): string {
  if (policy === 'Escalate') return 'badge-danger';
  if (policy === 'Review') return 'badge-warn';
  return 'badge-ok';
}
