import { createContext, useContext } from 'react';

interface ThemeContextType {
  effectiveTheme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  effectiveTheme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
