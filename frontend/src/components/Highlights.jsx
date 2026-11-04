import { Flame, Sparkles, Star } from 'lucide-react';
import { DOMAINS, formatNumber, trendLabel, newness } from '../utils';

const MiniCard = ({ tool, badge, onOpen }) => (
  <button className="mini-card" onClick={() => onOpen(tool)}>
    <div className="mini-top">
      <strong>{tool.name}</strong>
      {badge && <span className="badge-hot">{badge}</span>}
    </div>
    <p>{tool.description}</p>
    <div className="mini-foot">
      <span><Star size={12} /> {formatNumber(tool.stars || 0)}</span>
      <span className="tag">{tool.category}</span>
    </div>
  </button>
);

const Highlights = ({ tools, domain, onDomain, onOpen, onSeeMore }) => {
  const cats = DOMAINS[domain]?.cats;
  const trending = tools
    .filter((t) => t.trend > 0 && (!cats || cats.includes(t.category)))
    .sort((a, b) => b.trend - a.trend)
    .slice(0, 8);
  const fresh = tools
    .filter((t) => newness(t))
    .sort((a, b) => (newness(a) === 'hub' ? 0 : 1) - (newness(b) === 'hub' ? 0 : 1) || (b.stars || 0) - (a.stars || 0))
    .slice(0, 8);

  return (
    <section className="highlights">
      <div className="hl-block">
        <div className="hl-head">
          <h2><Flame size={18} /> Trending in</h2>
          <div className="chips">
            {Object.entries(DOMAINS).map(([key, { label }]) => (
              <button key={key} className={`chip small ${domain === key ? 'active' : ''}`} onClick={() => onDomain(key)}>{label}</button>
            ))}
          </div>
        </div>
        {trending.length ? (
          <div className="mini-grid">
            {trending.map((t) => <MiniCard key={t.url} tool={t} badge={trendLabel(t)} onOpen={onOpen} />)}
          </div>
        ) : <p className="muted-note">Not enough data for this domain yet.</p>}
        <p className="muted-note">Stars gained per week, measured from the hub's daily snapshots (estimated from repo age until a week of history exists).</p>
      </div>

      {fresh.length > 0 && (
        <div className="hl-block">
          <div className="hl-head">
            <h2><Sparkles size={18} /> New</h2>
            <button className="link-btn" onClick={onSeeMore}>What's new →</button>
          </div>
          <div className="mini-grid">
            {fresh.map((t) => <MiniCard key={t.url} tool={t} badge={newness(t) === 'hub' ? 'NEW' : 'NEW REPO'} onOpen={onOpen} />)}
          </div>
        </div>
      )}
    </section>
  );
};

export default Highlights;
