'use client';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.dataset.theme === 'dark');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const systemChange = () => {
      try {
        if (localStorage.getItem('unsui-theme')) return;
      } catch {}
      document.documentElement.dataset.theme = media.matches ? 'dark' : 'light';
    };
    media.addEventListener('change', systemChange);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', systemChange);
    };
  }, []);
  function toggle() {
    const next =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setDark(next === 'dark');
    try {
      localStorage.setItem('unsui-theme', next);
    } catch {}
  }
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className="theme-sun" size={19} />
      <Moon className="theme-moon" size={19} />
    </button>
  );
}
