import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Compass, Trophy, Layers, Sparkles, Heart, Tag, Box } from 'lucide-react';
import { capitalize } from '../utils';

const TABS = [
  { id: 'browse', label: 'Browse', Icon: Compass },
  { id: 'top', label: 'Top of the week', Icon: Trophy },
  { id: 'stack', label: 'Stack builder', Icon: Layers },
  { id: 'new', label: "What's new", Icon: Sparkles },
  { id: 'saved', label: 'Saved', Icon: Heart },
];

const CommandPalette = ({ fuse, categories, onClose, onTool, onTab, onCategory }) => {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const tabs = TABS.filter((t) => !term || t.label.toLowerCase().includes(term))
      .map((t) => ({ key: `tab-${t.id}`, label: `Go to ${t.label}`, Icon: t.Icon, run: () => onTab(t.id) }));
    const cats = categories.filter((c) => !term || c.includes(term))
      .map((c) => ({ key: `cat-${c}`, label: `Category: ${capitalize(c)}`, Icon: Tag, run: () => onCategory(c) }));
    const tools = term
      ? fuse.search(term, { limit: 8 }).map(({ item }) => ({
          key: item.url, label: item.name, hint: item.category, Icon: Box, run: () => onTool(item),
        }))
      : [];
    return [...tools, ...tabs, ...(term ? cats.slice(0, 4) : cats.slice(0, 0))];
  }, [q, fuse, categories, onTool, onTab, onCategory]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && items[index]) { items[index].run(); onClose(); }
  };

  return (
    <div className="modal-overlay palette-overlay" onClick={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a tool, category or page…"
            aria-label="Command palette"
          />
          <kbd>Esc</kbd>
        </div>
        <ul>
          {items.length === 0 && <li className="palette-empty">No matches</li>}
          {items.map(({ key, label, hint, Icon }, i) => (
            <li key={key}>
              <button className={i === index ? 'active' : ''} onMouseEnter={() => setIndex(i)} onClick={() => { items[i].run(); onClose(); }}>
                <Icon size={16} /> <span>{label}</span> {hint && <small>{hint}</small>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
