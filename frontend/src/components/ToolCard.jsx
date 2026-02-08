import React from 'react';
import { Star, ExternalLink, Box, Terminal, Copy, Download } from 'lucide-react';

const ToolCard = ({ tool, onClick }) => {
  const {
    name,
    description,
    stars,
    url,
    category,
    subcategory,
    topics,
    language,
    docker_pulls,
    install_cmd
  } = tool;

  const handleCopy = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    // Visual feedback could be added here
    alert(`Copied: ${text}`);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
  };

  return (
    <div className="tool-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="card-header">
        <div className="card-title">
          <h3>{name}</h3>
          {subcategory && <span className="subcategory-badge">{subcategory}</span>}
        </div>
        <div className="card-stats">
          {docker_pulls && (
            <div className="stat-badge docker-stat" title="Docker Pulls">
              <Download size={14} />
              <span>{formatNumber(docker_pulls)}</span>
            </div>
          )}
          {stars !== undefined && (
            <div className="stat-badge" title="GitHub Stars">
              <Star size={14} fill="currentColor" />
              <span>{formatNumber(stars)}</span>
            </div>
          )}
        </div>
      </div>

      <p className="description">{description || "No description available."}</p>

      <div className="card-footer">
        <div className="tags">
          <span className={`tag category-${category}`}>{category}</span>
          {language && <span className="tag language">{language}</span>}
        </div>

        <div className="actions">
          {install_cmd && (
            <button
              className="icon-btn copy-btn"
              onClick={(e) => handleCopy(e, install_cmd)}
              title={`Copy: ${install_cmd}`}
            >
              <Copy size={16} />
            </button>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="icon-btn" onClick={e => e.stopPropagation()}>
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ToolCard;
