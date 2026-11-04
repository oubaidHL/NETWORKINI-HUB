import { useMemo } from 'react';
import { Copy, Link2, Star } from 'lucide-react';
import { formatNumber } from '../utils';
import { NEEDS, PRESETS, suggest } from '../stack';
import { toolKey, keyToUrl } from '../hooks/useUrlFilters';

const StackBuilder = ({ tools, needs, picks, onNeeds, onPicks, onOpen, onCopy }) => {
  const needsKey = needs.join(',');
  const suggestions = useMemo(
    () => Object.fromEntries(NEEDS.filter((n) => needsKey.split(',').includes(n.id)).map((n) => [n.id, suggest(tools, n)])),
    [tools, needsKey]
  );
  const active = NEEDS.filter((n) => needs.includes(n.id));
  const picked = picks.map((k) => keyToUrl(tools, k)).filter(Boolean);

  const toggleNeed = (id) => onNeeds(needs.includes(id) ? needs.filter((n) => n !== id) : [...needs, id]);
  const togglePick = (t) => {
    const k = toolKey(t.url);
    onPicks(picks.includes(k) ? picks.filter((p) => p !== k) : [...picks, k]);
  };
  const markdown = () => `# My DevOps stack\n\n${picked.map((t) => `- [${t.name}](${t.url}) - ${t.description || ''}`).join('\n')}\n`;

  return (
    <div className="panel">
      <div className="panel-head"><h2>Stack builder</h2></div>
      <p className="muted-note">Pick what your platform needs. The hub suggests the most popular and active tools for each need; tick the ones you want to build your stack.</p>

      <div className="chips preset-row">
        {PRESETS.map((p) => <button key={p.label} className="chip" onClick={() => onNeeds(p.needs)}>{p.label}</button>)}
      </div>
      <div className="chips need-row">
        {NEEDS.map((n) => (
          <button key={n.id} className={`chip ${needs.includes(n.id) ? 'active' : ''}`} onClick={() => toggleNeed(n.id)}>{n.label}</button>
        ))}
      </div>

      <div className="stack-layout">
        <div>
          {active.length === 0 && <p className="muted-note">Choose a preset or a few needs above to get suggestions.</p>}
          {active.map((n) => (
            <div key={n.id} className="need-block">
              <h3>{n.label}</h3>
              <div className="related-list">
                {suggestions[n.id].map((t) => (
                  <div key={t.url} className={`related-item pickable ${picks.includes(toolKey(t.url)) ? 'picked' : ''}`}>
                    <button className="pick-main" onClick={() => onOpen(t)}>
                      <strong>{t.name}</strong>
                      <span><Star size={12} /> {formatNumber(t.stars || 0)}</span>
                      <small>{t.description}</small>
                    </button>
                    <button className="chip small" onClick={() => togglePick(t)}>{picks.includes(toolKey(t.url)) ? 'Remove' : 'Add'}</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="stack-summary">
          <h3>Your stack ({picked.length})</h3>
          {picked.length === 0 ? <p className="muted-note">Nothing selected yet.</p> : (
            <ul>{picked.map((t) => <li key={t.url}><button className="link-btn" onClick={() => onOpen(t)}>{t.name}</button></li>)}</ul>
          )}
          <div className="chips">
            <button className="chip" disabled={!picked.length} onClick={() => onCopy(markdown(), 'Stack copied as Markdown')}><Copy size={13} /> Markdown</button>
            <button className="chip" disabled={!picked.length} onClick={() => onCopy(window.location.href, 'Link to your stack copied')}><Link2 size={13} /> Share</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StackBuilder;
