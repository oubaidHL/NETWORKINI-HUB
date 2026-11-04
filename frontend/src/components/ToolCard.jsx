import { Star, ExternalLink, Copy, Download, Heart, Archive, GitCompare } from 'lucide-react';
import { formatNumber, timeAgo, isActive, newness, trendLabel } from '../utils';

const ToolCard = ({ tool, onClick, isFav, onToggleFav, onCopy, inCompare, onToggleCompare, onFilter, hot }) => {
  const {
    name, description, stars, url, category, subcategory, language,
    docker_pulls, install_cmd, last_updated, archived, topics, latest_release,
  } = tool;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <article
      className="tool-card"
      data-cat={category}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <div className="card-header">
        <div className="card-title">
          <h3>{name}</h3>
          {subcategory && (
            <button className="subcategory-badge clickable" onClick={stop(() => onFilter({ sub: subcategory }))} title="Show this section">
              {subcategory}
            </button>
          )}
        </div>
        <div className="card-stats">
          {docker_pulls > 0 && (
            <div className="stat-badge docker-stat" title="Docker pulls">
              <Download size={14} /><span>{formatNumber(docker_pulls)}</span>
            </div>
          )}
          {stars !== undefined && (
            <div className="stat-badge" title="GitHub stars">
              <Star size={14} fill="currentColor" /><span>{formatNumber(stars)}</span>
            </div>
          )}
        </div>
      </div>

      <p className="description">{description || tool.github_description || 'No description available.'}</p>

      {topics?.length > 0 && (
        <div className="tags card-topics">
          {topics.slice(0, 4).map((t) => (
            <button key={t} className="tag clickable" onClick={stop(() => onFilter({ topic: t }))}>#{t}</button>
          ))}
        </div>
      )}

      <div className="card-footer">
        <div className="tags">
          <span className={`tag category-${category}`}>{category}</span>
          {language && <span className="tag language">{language}</span>}
          {newness(tool) && <span className="tag badge-new">NEW</span>}
          {hot && trendLabel(tool) && <span className="tag badge-hot" title="Stars gained per week">🔥 {trendLabel(tool)}</span>}
          {latest_release?.tag && <span className="tag" title="Latest release">{latest_release.tag}</span>}
          {archived && <span className="tag archived"><Archive size={11} /> archived</span>}
          {last_updated && (
            <span className={`tag freshness ${isActive(last_updated) ? 'fresh' : ''}`} title="Last push">
              {timeAgo(last_updated)}
            </span>
          )}
        </div>

        <div className="actions">
          <button
            className={`icon-btn fav-btn ${isFav ? 'on' : ''}`}
            onClick={stop(onToggleFav)}
            title={isFav ? 'Remove from saved' : 'Save'}
            aria-pressed={isFav}
          >
            <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`icon-btn ${inCompare ? 'on' : ''}`}
            onClick={stop(onToggleCompare)}
            title={inCompare ? 'Remove from compare' : 'Add to compare'}
            aria-pressed={inCompare}
          >
            <GitCompare size={16} />
          </button>
          {install_cmd && (
            <button className="icon-btn copy-btn" onClick={stop(() => onCopy(install_cmd))} title={`Copy: ${install_cmd}`}>
              <Copy size={16} />
            </button>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="icon-btn" onClick={(e) => e.stopPropagation()} title="Open source">
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </article>
  );
};

export default ToolCard;
