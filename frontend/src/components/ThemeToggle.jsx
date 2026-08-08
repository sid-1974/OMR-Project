import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('omr-theme');
    if (savedTheme === 'light') {
      setIsLight(true);
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      setIsLight(false);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      setIsLight(false);
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('omr-theme', 'dark');
    } else {
      setIsLight(true);
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('omr-theme', 'light');
    }
  };

  return (
    <button 
      onClick={toggleTheme} 
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        borderRadius: '50%',
        transition: 'var(--transition)'
      }}
      title="Toggle Theme"
      className="theme-toggle-btn"
    >
      {isLight ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

export default ThemeToggle;
