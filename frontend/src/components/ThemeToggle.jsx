import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeToggle = () => {
    const [theme, setTheme] = useState(
        localStorage.getItem('theme') || 'system'
    );

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.remove('light', 'dark');
            root.classList.add(systemTheme);
        } else {
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <div className="theme-toggle">
            <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                title="Light Mode"
            >
                <Sun size={18} />
            </button>
            <button
                className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
                title="System Default"
            >
                <Monitor size={18} />
            </button>
            <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                title="Dark Mode"
            >
                <Moon size={18} />
            </button>
        </div>
    );
};

export default ThemeToggle;
