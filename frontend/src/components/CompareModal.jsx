import { X } from 'lucide-react';
import { formatNumber, timeAgo } from '../utils';

const ROWS = [
  ['Description', (t) => t.description || '—'],
  ['Category', (t) => t.category],
  ['Section', (t) => t.subcategory || '—'],
  ['Language', (t) => t.language || '—'],
  ['Stars', (t) => (t.stars !== undefined ? formatNumber(t.stars) : '—'), (t) => t.stars || 0],
  ['Forks', (t) => (t.forks !== undefined ? formatNumber(t.forks) : '—'), (t) => t.forks || 0],
  ['License', (t) => t.license || '—'],
  ['Last push', (t) => timeAgo(t.last_updated) || '—', (t) => new Date(t.last_updated || 0).getTime()],
  ['Docker pulls', (t) => (t.docker_pulls ? formatNumber(t.docker_pulls) : '—'), (t) => t.docker_pulls || 0],
  ['Install', (t) => (t.install_cmd ? <code>{t.install_cmd}</code> : '—')],
  ['Topics', (t) => (t.topics?.length ? t.topics.slice(0, 8).join(', ') : '—')],
];

const CompareModal = ({ tools, onClose, onOpen, onRemove }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content compare-modal" role="dialog" aria-modal="true" aria-label="Compare tools" onClick={(e) => e.stopPropagation()}>
      <button className="close-btn" onClick={onClose} aria-label="Close"><X size={24} /></button>
      <div className="modal-header"><h2>Compare tools</h2></div>
      <div className="modal-body compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th />
              {tools.map((t) => (
                <th key={t.url}>
                  <button className="link-btn" onClick={() => onOpen(t)}>{t.name}</button>
                  <button className="link-btn muted" onClick={() => onRemove(t.url)} aria-label={`Remove ${t.name}`}>remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, render, score]) => {
              const best = score && tools.length > 1 ? Math.max(...tools.map(score)) : null;
              return (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {tools.map((t) => (
                    <td key={t.url} className={best && score(t) === best && best > 0 ? 'best' : ''}>{render(t)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default CompareModal;
