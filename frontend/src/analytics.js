// Optional, privacy-friendly usage counts (GoatCounter: no cookies, no personal data).
// Enabled only when the GOATCOUNTER_CODE repository variable is set; honours Do Not Track.
const CODE = (import.meta.env.VITE_GOATCOUNTER || '').replace(/[^a-z0-9-]/gi, '');
const enabled = !!CODE && navigator.doNotTrack !== '1';

export const initAnalytics = () => {
  if (!enabled) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
  document.head.appendChild(s);
};

/** kind: 'tool' | 'save' | 'compare'; key: owner/repo */
export const track = (kind, key, title) => {
  if (!enabled) return;
  window.goatcounter?.count?.({ path: `${kind}/${key}`, title, event: true });
};
