import { formatNumber, timeAgo } from '../utils';

const StatsBar = ({ tools, categories, meta }) => {
  const totalStars = tools.reduce((n, t) => n + (t.stars || 0), 0);
  const updated = meta?.generated_at ? timeAgo(meta.generated_at) : null;
  const items = [
    ['Tools', tools.length.toLocaleString()],
    ['Categories', categories.length],
    ['GitHub stars', formatNumber(totalStars)],
    ...(updated ? [['Data refreshed', updated]] : []),
  ];
  return (
    <div className="stats-bar">
      {items.map(([label, value]) => (
        <div className="stat-tile" key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
