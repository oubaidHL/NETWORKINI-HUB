import { useRef } from 'react';
import { Download, Upload, Link2, Trash2, Heart, Star } from 'lucide-react';
import { formatNumber } from '../utils';
import { toolKey } from '../hooks/useUrlFilters';

const SavedView = ({ tools, favorites, setFavorites, shared, onOpen, onCopy, onDismissShared }) => {
  const fileRef = useRef(null);
  const byUrl = new Map(tools.map((t) => [t.url, t]));
  const mine = favorites.map((u) => byUrl.get(u)).filter(Boolean);
  const sharedTools = shared
    .map((k) => tools.find((t) => t.url === k || t.url === `https://github.com/${k}`))
    .filter(Boolean);
  const newShared = sharedTools.filter((t) => !favorites.includes(t.url));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, saved: favorites }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'networkini-hub-saved.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const urls = (Array.isArray(data) ? data : data.saved || []).filter((u) => typeof u === 'string' && u.startsWith('https://'));
      setFavorites((f) => [...new Set([...f, ...urls])]);
      onCopy('', `Imported ${urls.length} tools`, true);
    } catch {
      onCopy('', 'That file is not a valid export', true);
    }
  };

  const shareLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('mode', 'saved');
    url.searchParams.set('shared', favorites.map(toolKey).join(','));
    onCopy(url.href, 'Share link copied');
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2><Heart size={20} /> Saved tools <span className="count-pill">{mine.length}</span></h2>
        <div className="chips">
          <button className="chip" onClick={shareLink} disabled={!mine.length}><Link2 size={13} /> Share list</button>
          <button className="chip" onClick={exportJson} disabled={!mine.length}><Download size={13} /> Export</button>
          <button className="chip" onClick={() => fileRef.current?.click()}><Upload size={13} /> Import</button>
          <button className="chip reset" onClick={() => window.confirm('Remove all saved tools?') && setFavorites([])} disabled={!mine.length}>
            <Trash2 size={13} /> Clear
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
        </div>
      </div>
      <p className="muted-note">
        Your saved tools live in this browser only, so there's no account and nothing is uploaded. Use Export/Import to move them
        between devices, or Share list to send a link to a teammate.
      </p>

      {sharedTools.length > 0 && (
        <div className="shared-banner">
          <strong>{sharedTools.length} tools were shared with you.</strong>
          <div className="chips">
            {newShared.length > 0 && (
              <button className="chip active" onClick={() => { setFavorites((f) => [...new Set([...f, ...newShared.map((t) => t.url)])]); onDismissShared(); }}>
                Save {newShared.length} new
              </button>
            )}
            <button className="chip" onClick={onDismissShared}>Dismiss</button>
          </div>
          <ul className="plain-list">
            {sharedTools.map((t) => (
              <li key={t.url}><button className="link-btn" onClick={() => onOpen(t)}>{t.name}</button><small>{t.description}</small></li>
            ))}
          </ul>
        </div>
      )}

      {mine.length === 0 ? (
        <p className="empty-state">Nothing saved yet. Tap the ♥ on any tool to keep it here.</p>
      ) : (
        <ul className="saved-list">
          {mine.map((t) => (
            <li key={t.url}>
              <button className="saved-main" onClick={() => onOpen(t)}>
                <strong>{t.name}</strong>
                <span className="tag">{t.category}</span>
                <span className="saved-stars"><Star size={12} /> {formatNumber(t.stars || 0)}</span>
                <small>{t.description}</small>
              </button>
              <button className="icon-btn on" onClick={() => setFavorites((f) => f.filter((u) => u !== t.url))} aria-label={`Remove ${t.name}`}>
                <Heart size={16} fill="currentColor" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SavedView;
