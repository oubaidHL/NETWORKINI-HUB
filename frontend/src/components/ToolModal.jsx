import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { X, ExternalLink, Github, Terminal, Star, GitFork, Scale, Copy, Link2, Heart, GitCompare, Archive } from 'lucide-react';
import { formatNumber, timeAgo, trendLabel, safeHref } from '../utils';

const readmeCache = new Map();

const resolveUrl = (repo, url, key) => {
  if (!url || /^(https?:|mailto:|#)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return ''; // javascript:, data:, …
  const path = url.replace(/^\.?\//, '');
  return key === 'src'
    ? `https://raw.githubusercontent.com/${repo}/HEAD/${path}`
    : `https://github.com/${repo}/blob/HEAD/${path}`;
};

// READMEs are untrusted: raw HTML is parsed, then sanitized with a GitHub-like allow-list.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes.img || []), 'width', 'height', 'align'],
    '*': [...(defaultSchema.attributes['*'] || []), 'align'],
  },
};

// Resolves relative links/images that appear inside raw HTML.
const rehypeResolveUrls = (repo) => () => (tree) => {
  const walk = (node) => {
    if (node.type === 'element') {
      for (const key of ['src', 'href']) {
        if (typeof node.properties?.[key] === 'string') node.properties[key] = resolveUrl(repo, node.properties[key], key);
      }
    }
    node.children?.forEach(walk);
  };
  walk(tree);
};

const markdownComponents = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  img: ({ node: _node, ...props }) => <img {...props} loading="lazy" />,
};

const ToolModal = ({ tool, related, onClose, onOpen, onCopy, onFilter, isFav, onToggleFav, inCompare, onToggleCompare }) => {
  const [readme, setReadme] = useState({ url: null, text: '' });
  const isGithub = tool.url.includes('github.com');
  const repo = tool.url.replace(/^https?:\/\/(www\.)?github\.com\//, '');
  const loading = isGithub && readme.url !== tool.url;

  useEffect(() => {
    if (!isGithub) return;
    const cached = readmeCache.get(tool.url);
    if (cached !== undefined) {
      Promise.resolve().then(() => setReadme({ url: tool.url, text: cached }));
      return;
    }
    const controller = new AbortController();
    (async () => {
      let text = 'Could not load the README. Open the repository for details.';
      try {
        for (const file of ['README.md', 'readme.md', 'README.rst', 'README']) {
          const res = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${file}`, { signal: controller.signal });
          if (res.ok) { text = await res.text(); readmeCache.set(tool.url, text); break; }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        text = 'Error loading the README.';
      }
      setReadme({ url: tool.url, text });
    })();
    return () => controller.abort();
  }, [tool.url, isGithub, repo]);

  const facts = [
    tool.stars !== undefined && { Icon: Star, text: `${formatNumber(tool.stars)} stars` },
    tool.forks !== undefined && { Icon: GitFork, text: `${formatNumber(tool.forks)} forks` },
    tool.license && { Icon: Scale, text: tool.license },
    tool.archived && { Icon: Archive, text: 'Archived' },
  ].filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-label={tool.name} onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close"><X size={24} /></button>

        <div className="modal-header">
          <h2>{tool.name}</h2>
          <div className="modal-links">
            <a href={safeHref(tool.url)} target="_blank" rel="noopener noreferrer" className="modal-link">
              {isGithub ? <Github size={18} /> : <ExternalLink size={18} />} {isGithub ? 'Source' : 'Website'}
            </a>
            {tool.docker_url && (
              <a href={safeHref(tool.docker_url)} target="_blank" rel="noopener noreferrer" className="modal-link">
                <Terminal size={18} /> Docker Hub
              </a>
            )}
            <button className="modal-link" onClick={() => onToggleFav(tool.url)}>
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} /> {isFav ? 'Saved' : 'Save'}
            </button>
            <button className="modal-link" onClick={() => onToggleCompare(tool.url)}>
              <GitCompare size={18} /> {inCompare ? 'In compare' : 'Compare'}
            </button>
            <button className="modal-link" onClick={() => onCopy(window.location.href, 'Link copied')}>
              <Link2 size={18} /> Share
            </button>
          </div>
          {facts.length > 0 && (
            <div className="modal-facts">
              {facts.map(({ Icon, text }) => <span key={text}><Icon size={14} /> {text}</span>)}
              {tool.language && <span>{tool.language}</span>}
              {trendLabel(tool) && <span title={tool.trend_measured ? 'Measured' : 'Estimated from repo age'}>🔥 {trendLabel(tool)}{tool.trend_measured ? '' : ' (est.)'}</span>}
              {tool.latest_release?.tag && <span>Release {tool.latest_release.tag} · {timeAgo(tool.latest_release.published_at)}</span>}
              {tool.last_updated && <span>Updated {timeAgo(tool.last_updated)}</span>}
            </div>
          )}
        </div>

        <div className="modal-body">
          <p className="tool-full-description">{tool.description || tool.github_description}</p>

          <div className="tags topic-tags">
            <button className="tag clickable" onClick={() => onFilter({ cat: tool.category })}>{tool.category}</button>
            {tool.subcategory && (
              <button className="tag clickable" onClick={() => onFilter({ sub: tool.subcategory })}>{tool.subcategory}</button>
            )}
            {tool.topics?.map((t) => (
              <button key={t} className="tag clickable" onClick={() => onFilter({ topic: t })}>#{t}</button>
            ))}
          </div>

          {tool.install_cmd && (
            <button className="install-cmd" onClick={() => onCopy(tool.install_cmd)} title="Click to copy">
              <code>$ {tool.install_cmd}</code> <Copy size={14} />
            </button>
          )}

          {related.length > 0 && (
            <div className="related">
              <h3>Similar tools</h3>
              <div className="related-list">
                {related.map((r) => (
                  <button key={r.url} className="related-item" onClick={() => onOpen(r)}>
                    <strong>{r.name}</strong>
                    <span><Star size={12} /> {formatNumber(r.stars || 0)}</span>
                    <small>{r.description}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isGithub && (
            <div className="readme-container">
              <h3>README</h3>
              {loading ? (
                <div className="spinner">Loading README…</div>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeResolveUrls(repo), [rehypeSanitize, schema]]}
                    components={markdownComponents}
                    urlTransform={(url, key) => resolveUrl(repo, url, key)}
                  >
                    {readme.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolModal;
