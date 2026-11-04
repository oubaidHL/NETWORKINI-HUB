import { Trophy, Star } from 'lucide-react';
import { DOMAINS, formatNumber, trendLabel, timeAgo } from '../utils';

const MEDALS = ['🥇', '🥈', '🥉'];

const TopWeek = ({ tools, domain, onDomain, onOpen, generatedAt }) => {
  const cats = DOMAINS[domain]?.cats;
  const ranked = tools
    .filter((t) => t.trend > 0 && !t.archived && (!cats || cats.includes(t.category)))
    // Measured weekly gains outrank estimates; ties fall back to total stars.
    .sort((a, b) => (b.trend_measured ? 1 : 0) - (a.trend_measured ? 1 : 0) || b.trend - a.trend || (b.stars || 0) - (a.stars || 0))
    .slice(0, 25);
  const measured = ranked.some((t) => t.trend_measured);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2><Trophy size={20} /> Top of the week</h2>
        <div className="chips">
          {Object.entries(DOMAINS).map(([key, { label }]) => (
            <button key={key} className={`chip small ${domain === key ? 'active' : ''}`} onClick={() => onDomain(key)}>{label}</button>
          ))}
        </div>
      </div>
      <p className="muted-note">
        Repositories gaining the most GitHub stars per week{generatedAt ? ` (data refreshed ${timeAgo(generatedAt)})` : ''}.
        {measured ? ' Entries marked "est." are estimated from repo age until a week of daily snapshots exists.' : ' Until a week of daily snapshots exists, gains are estimated from repo age.'}
      </p>

      {ranked.length === 0 ? <p className="empty-state">Not enough data for this domain yet.</p> : (
        <ol className="top-list">
          {ranked.map((t, i) => (
            <li key={t.url}>
              <span className="rank">{MEDALS[i] || i + 1}</span>
              <button className="top-main" onClick={() => onOpen(t)}>
                <strong>{t.name}</strong>
                <span className="tag" data-cat={t.category}>{t.category}</span>
                {t.language && <span className="tag">{t.language}</span>}
                <small>{t.description || t.github_description}</small>
              </button>
              <div className="top-nums">
                <span className="badge-hot">{trendLabel(t)}{t.trend_measured ? '' : ' est.'}</span>
                <span className="saved-stars"><Star size={12} /> {formatNumber(t.stars || 0)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default TopWeek;
