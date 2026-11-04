import { useEffect, useState } from 'react';
import FollowBox from './FollowBox';
import { newness, formatNumber } from '../utils';

const DATA_URL = `${import.meta.env.BASE_URL}data/`;

const WhatsNew = ({ tools, onOpen }) => {
  const categories = [...new Set(tools.map((t) => t.category))].filter(Boolean).sort();
  const [log, setLog] = useState(null);

  useEffect(() => {
    fetch(`${DATA_URL}changelog.json`).then((r) => (r.ok ? r.json() : [])).then(setLog).catch(() => setLog([]));
  }, []);

  const byUrl = new Map(tools.map((t) => [t.url, t]));
  const young = tools.filter((t) => newness(t) === 'repo').sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 12);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>What's new</h2>
      </div>

      <FollowBox categories={categories} />

      <h3>Added to the hub</h3>
      {log === null && <p className="muted-note">Loading…</p>}
      {log?.length === 0 && <p className="muted-note">Nothing added since tracking started. Newly discovered tools show up here after each daily refresh.</p>}
      {log?.map((entry) => (
        <div key={entry.date} className="log-entry">
          <h4>{new Date(entry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} <span>{entry.count} new</span></h4>
          <ul>
            {entry.added.map((a) => (
              <li key={a.url}>
                <button className="link-btn" onClick={() => byUrl.has(a.url) && onOpen(byUrl.get(a.url))}>{a.name}</button>
                <span className="tag">{a.category}</span>
                <small>{a.description}</small>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {young.length > 0 && (
        <>
          <h3>Young repositories (created in the last 4 months)</h3>
          <ul className="plain-list">
            {young.map((t) => (
              <li key={t.url}>
                <button className="link-btn" onClick={() => onOpen(t)}>{t.name}</button>
                <span className="tag">{t.category}</span>
                <small>★ {formatNumber(t.stars || 0)} · {t.description}</small>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default WhatsNew;
