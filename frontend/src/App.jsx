import React, { useState, useEffect, useRef } from 'react';
import ToolCard from './components/ToolCard';
import FilterBar from './components/FilterBar';
import ThemeToggle from './components/ThemeToggle';
import './App.css';
import Fuse from 'fuse.js';
import { Github, Linkedin, HelpCircle, X, Command } from 'lucide-react';

function App() {
  const [tools, setTools] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const searchInputRef = useRef(null);

  useEffect(() => {
    // Keyboard Shortcuts
    const handleKeyDown = (e) => {
      // Search: Ctrl+K or Ctrl+F
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to close modals/clear search
      if (e.key === 'Escape') {
        setSelectedTool(null);
        setShowHelp(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetch('/data/tools.json')
      .then(res => res.json())
      .then(data => {
        setTools(data);
        setFilteredTools(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching tools:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = tools;

    if (category !== 'all') {
      result = result.filter(tool => tool.category === category);
    }

    if (searchTerm) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'name', weight: 0.4 },
          { name: 'description', weight: 0.3 },
          { name: 'subcategory', weight: 0.2 },
          { name: 'topics', weight: 0.1 }
        ],
        threshold: 0.4,
        ignoreLocation: true
      });

      const fuseResult = fuse.search(searchTerm);
      result = fuseResult.map(res => res.item);
    } else {
      result.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    }

    setFilteredTools(result);
    setCurrentPage(1);
  }, [searchTerm, category, tools]);

  const categories = [...new Set(tools.map(t => t.category))].filter(Boolean);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTools = filteredTools.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
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
            <a href="https://linkedin.com/in/oubaidhlaimi/" target="_blank" rel="noopener noreferrer" className="icon-link" title="My LinkedIn">
              <Linkedin size={22} />
            </a>
            <div className="separator"></div>
            <ThemeToggle />
            <button className="icon-btn-header" onClick={() => setShowHelp(true)} title="Shortcuts & Help">
              <HelpCircle size={22} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          category={category}
          setCategory={setCategory}
          categories={categories}
          inputRef={searchInputRef}
        />

        {loading ? (
          <div className="loading">Loading tools...</div>
        ) : (
          <>
            <div className="results-info">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredTools.length)} of {filteredTools.length} tools
            </div>
            <div className="tools-grid">
              {currentTools.length > 0 ? (
                currentTools.map((tool, index) => (
                  <ToolCard key={`${tool.url}-${index}`} tool={tool} onClick={() => setSelectedTool(tool)} />
                ))
              ) : (
                <div className="no-results">No tools found matching your criteria.</div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  Previous
                </button>

                <div className="page-numbers">
                  {[...Array(Math.min(totalPages, 10))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 10 && <span>... {totalPages}</span>}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedTool && (
        <React.Suspense fallback={null}>
          <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
        </React.Suspense>
      )}

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content help-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowHelp(false)}>
              <X size={24} />
            </button>
            <div className="modal-header">
              <h2>Keyboard Shortcuts</h2>
            </div>
            <div className="modal-body">
              <div className="shortcut-list">
                <div className="shortcut-item">
                  <span className="key-combo">
                    <kbd style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--tag-bg)', border: '1px solid var(--border-color)' }}>Ctrl</kbd> + <kbd style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--tag-bg)', border: '1px solid var(--border-color)' }}>K</kbd>
                  </span>
                  <span>Focus Search Bar</span>
                </div>
                <div className="shortcut-item">
                  <span className="key-combo">
                    <kbd style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--tag-bg)', border: '1px solid var(--border-color)' }}>Esc</kbd>
                  </span>
                  <span>Close Modal / Clear Search</span>
                </div>
              </div>

              <div className="about-section">
                <h3>About</h3>
                <p>
                  Designed & Developed by <strong>Oubaid Hlaimi</strong>.
                  <br />
                  Built with React, Vite, Fuse.js, and Docker.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>Powered by <a href="https://github.com/HLAIMIOubaid/Antigravity">Antigravity</a> & Awesome Lists</p>
      </footer>
    </div>
  );
}

// Lazy load modal
const ToolModal = React.lazy(() => import('./components/ToolModal'));

export default App;
