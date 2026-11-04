import { useCallback, useEffect, useState } from 'react';

const DEFAULTS = {
  q: '', cat: 'all', lang: 'all', sort: 'stars', topic: '', sub: '',
  fav: false, active: false, page: 1, tool: '',
  mode: 'browse', dom: 'infra', stack: '', pick: '', shared: '',
};

const read = () => {
  const p = new URLSearchParams(window.location.search);
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    const raw = p.get(key);
    if (raw === null) continue;
    if (typeof DEFAULTS[key] === 'boolean') out[key] = raw === '1';
    else if (key === 'page') out[key] = Math.max(1, parseInt(raw, 10) || 1);
    else out[key] = raw;
  }
  return out;
};

/** Filter + open-tool state mirrored into the query string so every view is shareable. */
export default function useUrlFilters() {
  const [filters, setFilters] = useState(read);

  useEffect(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== DEFAULTS[k]) p.set(k, v === true ? '1' : v);
    });
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  // Changing a filter returns to page 1; opening/closing a tool keeps the page.
  const update = useCallback((patch) => {
    setFilters((f) => ({ ...f, ...('tool' in patch ? {} : { page: 1 }), ...patch }));
  }, []);

  const reset = useCallback(() => setFilters((f) => ({ ...DEFAULTS, tool: f.tool })), []);

  return [filters, update, reset];
}

export const toolKey = (url) => url.replace(/^https:\/\/github\.com\//, '');
export const keyToUrl = (tools, key) =>
  tools.find((t) => {
    const full = key.startsWith('http') ? key : `https://github.com/${key}`;
    return t.url === full || t.aliases?.includes(full);
  }) || null;
