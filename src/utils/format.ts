export function fmt$(n: number, decimals = 0): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtPct(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`;
}

export function fmtK(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
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
