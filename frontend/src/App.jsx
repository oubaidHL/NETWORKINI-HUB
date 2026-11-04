import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import Fuse from 'fuse.js';
import { Github, Linkedin, HelpCircle, X, RefreshCw, Shuffle, GitCompare, Compass, Layers, Sparkles } from 'lucide-react';
import ToolCard from './components/ToolCard';
import FilterBar from './components/FilterBar';
import ThemeToggle from './components/ThemeToggle';
import StatsBar from './components/StatsBar';
import Pagination from './components/Pagination';
import Toast from './components/Toast';
import TopicCloud from './components/TopicCloud';
import CompareModal from './components/CompareModal';
import Highlights from './components/Highlights';
import WhatsNew from './components/WhatsNew';
import StackBuilder from './components/StackBuilder';
import useLocalStorage from './hooks/useLocalStorage';
import useUrlFilters, { toolKey, keyToUrl } from './hooks/useUrlFilters';
import { SORTS, isActive } from './utils';
import './App.css';

const ToolModal = lazy(() => import('./components/ToolModal'));

const ITEMS_PER_PAGE = 48;
const DATA_URL = `${import.meta.env.BASE_URL}data/`;

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.35 },
    { name: 'description', weight: 0.25 },
    { name: 'topics', weight: 0.15 },
    { name: 'github_description', weight: 0.1 },
    { name: 'subcategory', weight: 0.1 },
    { name: 'language', weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

function App() {
  const [tools, setTools] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [compare, setCompare] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState('');
  const [favorites, setFavorites] = useLocalStorage('favorites', []);
  const [view, setView] = useLocalStorage('view', 'grid');
  const [filters, update, reset] = useUrlFilters();
  const searchInputRef = useRef(null);
  const showCompareRef = useRef(false);
  const helpRef = useRef(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  const copy = useCallback(async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message || `Copied: ${text}`);
    } catch {
      showToast('Copy failed');
    }
  }, [showToast]);

  const toggleFav = useCallback((url) => {
    setFavorites((favs) => (favs.includes(url) ? favs.filter((u) => u !== url) : [...favs, url]));
  }, [setFavorites]);

  const toggleCompare = useCallback((url) => {
    setCompare((c) => {
      if (c.includes(url)) return c.filter((u) => u !== url);
      if (c.length >= 3) { showToast('You can compare up to 3 tools'); return c; }
      return [...c, url];
    });
  }, [showToast]);

  const load = useCallback(() => {
    fetch(`${DATA_URL}tools.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => { setTools(data); setStatus('ready'); })
      .catch((err) => { console.error('Error fetching tools:', err); setStatus('error'); });
    fetch(`${DATA_URL}meta.json`).then((r) => (r.ok ? r.json() : null)).then(setMeta).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { showCompareRef.current = showCompare; helpRef.current = showHelp; });

  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '?' && !typing) {
        setShowHelp(true);
      } else if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) searchInputRef.current.blur();
        else if (showCompareRef.current) setShowCompare(false);
        else if (!helpRef.current) update({ tool: '' });
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [update]);

  const categories = useMemo(() => [...new Set(tools.map((t) => t.category))].filter(Boolean).sort(), [tools]);
  const languages = useMemo(() => [...new Set(tools.map((t) => t.language).filter(Boolean))].sort(), [tools]);
  const topics = useMemo(() => {
    const counts = new Map();
    tools.forEach((t) => t.topics?.forEach((x) => counts.set(x, (counts.get(x) || 0) + 1)));
    return [...counts].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 16);
  }, [tools]);
  const fuse = useMemo(() => new Fuse(tools, FUSE_OPTIONS), [tools]);

  // Search first, so category chip counts reflect the current query.
  const searched = useMemo(() => {
    const q = filters.q.trim();
    return q ? fuse.search(q).map((r) => r.item) : tools;
  }, [fuse, tools, filters.q]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(categories.map((c) => [c, 0]));
    searched.forEach((t) => { if (t.category in counts) counts[t.category]++; });
    return counts;
  }, [searched, categories]);

  const results = useMemo(() => {
    const favSet = new Set(favorites);
    let list = searched.filter((t) =>
      (filters.cat === 'all' || t.category === filters.cat) &&
      (filters.lang === 'all' || t.language === filters.lang) &&
      (!filters.topic || t.topics?.includes(filters.topic)) &&
      (!filters.sub || t.subcategory === filters.sub) &&
      (!filters.fav || favSet.has(t.url)) &&
      (!filters.active || isActive(t.last_updated))
    );
    // With a text query, keep Fuse's relevance order unless a sort is chosen explicitly.
    if (!filters.q.trim() || filters.sort !== 'stars') {
      list = [...list].sort((SORTS[filters.sort] || SORTS.stars).fn);
    }
    return list;
  }, [searched, filters, favorites]);

  const selectedTool = useMemo(() => (filters.tool ? keyToUrl(tools, filters.tool) : null), [tools, filters.tool]);
  const openTool = useCallback((t) => update({ tool: toolKey(t.url) }), [update]);
  const related = useMemo(() => {
    if (!selectedTool) return [];
    const mine = new Set(selectedTool.topics || []);
    return tools
      .filter((t) => t.url !== selectedTool.url)
      .map((t) => {
        const shared = (t.topics || []).filter((x) => mine.has(x)).length;
        const sameSub = t.subcategory && t.subcategory === selectedTool.subcategory ? 1 : 0;
        return { t, score: shared * 2 + sameSub + (t.category === selectedTool.category ? 0.5 : 0), shared, sameSub };
      })
      .filter((x) => x.shared > 0 || x.sameSub)
      .sort((a, b) => b.score - a.score || (b.t.stars || 0) - (a.t.stars || 0))
      .slice(0, 6)
      .map((x) => x.t);
  }, [tools, selectedTool]);
  const hotSet = useMemo(
    () => new Set(tools.filter((t) => t.trend > 0).sort((a, b) => b.trend - a.trend).slice(0, 40).map((t) => t.url)),
    [tools]
  );
  const compareTools = useMemo(() => compare.map((u) => tools.find((t) => t.url === u)).filter(Boolean), [compare, tools]);
  const surprise = () => {
    if (results.length) openTool(results[Math.floor(Math.random() * results.length)]);
  };

  const isFiltered = !!(filters.q || filters.cat !== 'all' || filters.lang !== 'all' || filters.topic ||
    filters.sub || filters.fav || filters.active || filters.sort !== 'stars');

  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * ITEMS_PER_PAGE;
  const pageTools = results.slice(start, start + ITEMS_PER_PAGE);

  const goToPage = (p) => {
    update({ page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <div className="logo-section">
            <h1>NETWORKINI-HUB</h1>
            <p>Curated list of awesome DevOps tools</p>
          </div>
          <div className="header-controls">
            <a href="https://github.com/oubaidHL/NETWORKINI-HUB" target="_blank" rel="noopener noreferrer" className="icon-link" title="Source Code">
              <Github size={22} />
            </a>
            <a href="https://linkedin.com/in/oubaidhlaimi/" target="_blank" rel="noopener noreferrer" className="icon-link" title="LinkedIn">
              <Linkedin size={22} />
            </a>
            <div className="separator"></div>
            <ThemeToggle />
            <button className="icon-btn-header" onClick={() => setShowHelp(true)} title="Shortcuts & Help (?)">
              <HelpCircle size={22} />
            </button>
          </div>
        </div>
      </header>

      <nav className="mode-nav" aria-label="Sections">
        {[['browse', 'Browse', Compass], ['stack', 'Stack builder', Layers], ['new', "What's new", Sparkles]].map(([id, label, Icon]) => (
          <button key={id} className={filters.mode === id ? 'active' : ''} onClick={() => update({ mode: id, tool: filters.tool })}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      <main>
        {status === 'ready' && filters.mode === 'stack' && (
          <StackBuilder
            tools={tools}
            needs={filters.stack ? filters.stack.split(',') : []}
            picks={filters.pick ? filters.pick.split(',') : []}
            onNeeds={(n) => update({ stack: n.join(','), tool: filters.tool })}
            onPicks={(p) => update({ pick: p.join(','), tool: filters.tool })}
            onOpen={openTool}
            onCopy={copy}
          />
        )}
        {status === 'ready' && filters.mode === 'new' && <WhatsNew tools={tools} onOpen={openTool} />}
        {filters.mode === 'browse' && <>
        {status === 'ready' && <StatsBar tools={tools} categories={categories} meta={meta} />}

        <FilterBar
          filters={filters}
          update={update}
          reset={reset}
          inputRef={searchInputRef}
          categoryCounts={categoryCounts}
          totalCount={searched.length}
          languages={languages}
          view={view}
          setView={setView}
          favCount={favorites.length}
        />

        {status === 'ready' && !isFiltered && page === 1 && (
          <Highlights
            tools={tools}
            domain={filters.dom}
            onDomain={(dom) => update({ dom, tool: filters.tool })}
            onOpen={openTool}
            onSeeMore={() => update({ mode: 'new' })}
          />
        )}

        {status === 'ready' && topics.length > 0 && (
          <TopicCloud topics={topics} active={filters.topic} onSelect={(topic) => update({ topic })} />
        )}

        {status === 'loading' && (
          <div className="tools-grid">
            {Array.from({ length: 9 }, (_, i) => <div key={i} className="tool-card skeleton" />)}
          </div>
        )}

        {status === 'error' && (
          <div className="no-results">
            <p>Could not load the tools data.</p>
            <button className="page-btn" onClick={() => { setStatus('loading'); load(); }}><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="results-info">
              <span>
                {results.length === 0
                  ? '0 tools'
                  : `Showing ${start + 1}–${start + pageTools.length} of ${results.length} tools`}
              </span>
              <button className="link-btn" onClick={surprise} disabled={!results.length}><Shuffle size={14} /> Surprise me</button>
            </div>
            <div className={`tools-grid ${view === 'list' ? 'list-view' : ''}`}>
              {pageTools.length > 0 ? (
                pageTools.map((tool) => (
                  <ToolCard
                    key={tool.url}
                    tool={tool}
                    isFav={favorites.includes(tool.url)}
                    onToggleFav={() => toggleFav(tool.url)}
                    onCopy={copy}
                    hot={hotSet.has(tool.url)}
                    inCompare={compare.includes(tool.url)}
                    onToggleCompare={() => toggleCompare(tool.url)}
                    onFilter={update}
                    onClick={() => openTool(tool)}
                  />
                ))
              ) : (
                <div className="no-results">
                  <p>No tools match your filters.</p>
                  <button className="page-btn" onClick={reset}>Reset filters</button>
                </div>
              )}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
          </>
        )}
        </>}
      </main>

      {compare.length > 0 && (
        <div className="compare-bar">
          <GitCompare size={16} />
          <span>{compare.length} selected</span>
          <button className="chip active" disabled={compare.length < 2} onClick={() => setShowCompare(true)}>Compare</button>
          <button className="chip" onClick={() => setCompare([])}>Clear</button>
        </div>
      )}

      {showCompare && compareTools.length > 0 && (
        <CompareModal
          tools={compareTools}
          onClose={() => setShowCompare(false)}
          onOpen={(t) => { setShowCompare(false); openTool(t); }}
          onRemove={(u) => { toggleCompare(u); if (compare.length <= 2) setShowCompare(false); }}
        />
      )}

      {selectedTool && (
        <Suspense fallback={null}>
          <ToolModal
            tool={selectedTool}
            related={related}
            onClose={() => update({ tool: '' })}
            onOpen={openTool}
            onCopy={copy}
            onFilter={(patch) => update({ ...patch, tool: '' })}
            isFav={favorites.includes(selectedTool.url)}
            onToggleFav={toggleFav}
            inCompare={compare.includes(selectedTool.url)}
            onToggleCompare={toggleCompare}
          />
        </Suspense>
      )}

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowHelp(false)} aria-label="Close"><X size={24} /></button>
            <div className="modal-header"><h2>Keyboard Shortcuts</h2></div>
            <div className="modal-body">
              <div className="shortcut-list">
                {[
                  [['Ctrl/⌘', 'K'], 'Focus search'],
                  [['/'], 'Focus search'],
                  [['?'], 'Open this help'],
                  [['Esc'], 'Close dialogs / leave search'],
                  [['Enter'], 'Open the focused card'],
                ].map(([keys, label]) => (
                  <div className="shortcut-item" key={label + keys.join()}>
                    <span className="key-combo">
                      {keys.map((k, i) => <span key={k}>{i > 0 && ' + '}<kbd>{k}</kbd></span>)}
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="about-section">
                <h3>About</h3>
                <p>
                  Designed &amp; developed by <strong>Oubaid Hlaimi</strong>.<br />
                  Built with React, Vite and Fuse.js. Filters live in the URL, so any view can be shared.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />

      <footer>
        <p>Data from community <em>Awesome</em> lists, refreshed daily. <button className="link-btn" onClick={() => update({ mode: 'new' })}>Follow new tools</button></p>
      </footer>
    </div>
  );
}

export default App;
