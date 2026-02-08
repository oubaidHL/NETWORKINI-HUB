import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, ExternalLink, Github, Terminal } from 'lucide-react';

const ToolModal = ({ tool, onClose }) => {
    const [readmeContent, setReadmeContent] = useState('');
    const [loadingReadme, setLoadingReadme] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // details | installation

    useEffect(() => {
        if (tool && tool.url && tool.url.includes('github.com')) {
            setLoadingReadme(true);
            // Construct raw URL
            // https://github.com/user/repo -> https://raw.githubusercontent.com/user/repo/master/README.md
            // This is a naive heuristic, might fail for main branch or other default branches.
            // But we can try 'master', then 'main'.

            const repoPath = tool.url.replace('https://github.com/', '');
            const fetchReadme = async () => {
                try {
                    let res = await fetch(`https://raw.githubusercontent.com/${repoPath}/master/README.md`);
                    if (!res.ok) {
                        res = await fetch(`https://raw.githubusercontent.com/${repoPath}/main/README.md`);
                    }
                    if (res.ok) {
                        const text = await res.text();
                        setReadmeContent(text);
                    } else {
                        setReadmeContent("Could not load README. Please visit the repository.");
                    }
                } catch (e) {
                    setReadmeContent("Error loading README.");
                } finally {
                    setLoadingReadme(false);
                }
            };

            fetchReadme();
        }
    }, [tool]);

    if (!tool) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <div className="modal-header">
                    <h2>{tool.name}</h2>
                    <div className="modal-links">
                        <a href={tool.url} target="_blank" rel="noopener noreferrer" className="modal-link">
                            <Github size={18} /> GitHub
                        </a>
                        {tool.docker_url && (
                            <a href={tool.docker_url} target="_blank" rel="noopener noreferrer" className="modal-link">
                                <Terminal size={18} /> Docker Hub
                            </a>
                        )}
                    </div>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Details & README
                    </button>
                    {/* Future: Add Installation tab if we parse commands specifically */}
                </div>

                <div className="modal-body">
                    <p className="tool-full-description">{tool.description}</p>

                    <div className="readme-container">
                        <h3>README</h3>
                        {loadingReadme ? (
                            <div className="spinner">Loading README...</div>
                        ) : (
                            <div className="markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {readmeContent}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToolModal;
