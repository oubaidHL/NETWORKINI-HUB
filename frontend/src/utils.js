export const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
};

export const timeAgo = (iso) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 31) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

// Pushed to within the last 90 days.
export const isActive = (iso) => !!iso && Date.now() - new Date(iso).getTime() < 90 * 86_400_000;

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const SORTS = {
  stars: { label: 'Most stars', fn: (a, b) => (b.stars || 0) - (a.stars || 0) },
  updated: { label: 'Recently updated', fn: (a, b) => (b.last_updated || '').localeCompare(a.last_updated || '') },
  name: { label: 'Name (A–Z)', fn: (a, b) => a.name.localeCompare(b.name) },
  trending: { label: 'Trending', fn: (a, b) => (b.trend || 0) - (a.trend || 0) },
  released: { label: 'Latest release', fn: (a, b) => (b.latest_release?.published_at || '').localeCompare(a.latest_release?.published_at || '') },
  pulls: { label: 'Docker pulls', fn: (a, b) => (b.docker_pulls || 0) - (a.docker_pulls || 0) },
};

const daysSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity);

/** 'hub' = added to the hub recently, 'repo' = a young repository, null = neither. */
export const newness = (t) => {
  if (daysSince(t.first_seen) <= 30) return 'hub';
  if (daysSince(t.created_at) <= 120) return 'repo';
  return null;
};

export const DOMAINS = {
  infra: { label: 'Infrastructure', cats: ['docker', 'kubernetes', 'terraform', 'ansible', 'cloud', 'gitops', 'sysadmin'] },
  cicd: { label: 'CI/CD & DevOps', cats: ['cicd', 'devops', 'gitops'] },
  observability: { label: 'Observability', cats: ['monitoring', 'observability'] },
  security: { label: 'Security', cats: ['security'] },
  data: { label: 'Data', cats: ['databases'] },
  all: { label: 'Everything', cats: null },
};

export const trendLabel = (t) => (t.trend > 0 ? `+${formatNumber(t.trend)}★/wk` : null);
