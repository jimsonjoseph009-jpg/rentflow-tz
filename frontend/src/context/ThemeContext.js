import { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    localStorage.setItem('appTheme', 'dark');
    localStorage.setItem('darkMode', JSON.stringify(true));
    document.documentElement.setAttribute('data-theme', 'dark');
  }, [theme]);

  const isDark = true;
  const setTheme = () => setThemeState('dark');
  const toggleTheme = () => setThemeState('dark');

  return (
    <ThemeContext.Provider value={{ isDark, theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
