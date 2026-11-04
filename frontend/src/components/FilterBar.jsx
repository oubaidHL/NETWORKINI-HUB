import { Search, X, Heart, LayoutGrid, List, Zap } from 'lucide-react';
import { SORTS, capitalize } from '../utils';

const FilterBar = ({
  filters, update, reset, inputRef, categoryCounts, totalCount, languages,
  view, setView, favCount,
}) => {
  const dirty = filters.q || filters.cat !== 'all' || filters.lang !== 'all' || filters.fav || filters.active || filters.topic || filters.sub;

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tools, topics, categories…  (Ctrl + K)"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            aria-label="Search tools"
          />
          {filters.q && (
            <button className="clear-btn" onClick={() => update({ q: '' })} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort by">
          {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
        </select>

        <select value={filters.lang} onChange={(e) => update({ lang: e.target.value })} aria-label="Language">
          <option value="all">Any language</option>
          {languages.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="filter-row chips-row">
        <div className="chips">
          <button className={`chip ${filters.cat === 'all' ? 'active' : ''}`} onClick={() => update({ cat: 'all' })}>
            All <span>{totalCount}</span>
          </button>
          {Object.entries(categoryCounts).map(([cat, n]) => (
            <button
              key={cat}
              className={`chip ${filters.cat === cat ? 'active' : ''}`}
              onClick={() => update({ cat })}
            >
              {capitalize(cat)} <span>{n}</span>
            </button>
          ))}
        </div>

        <div className="toggles">
          <button className={`chip ${filters.active ? 'active' : ''}`} onClick={() => update({ active: !filters.active })}
            title="Pushed to in the last 90 days">
            <Zap size={14} /> Active
          </button>
          <button className={`chip ${filters.fav ? 'active' : ''}`} onClick={() => update({ fav: !filters.fav })}>
            <Heart size={14} /> Saved <span>{favCount}</span>
          </button>
          <div className="view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={16} /></button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={16} /></button>
          </div>
          {filters.topic && <button className="chip active" onClick={() => update({ topic: '' })}>#{filters.topic} <X size={12} /></button>}
          {filters.sub && <button className="chip active" onClick={() => update({ sub: '' })}>{filters.sub} <X size={12} /></button>}
          {dirty && <button className="chip reset" onClick={reset}>Reset</button>}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
