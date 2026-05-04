import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

export const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
      aria-label="Toggle theme"
    >
      {mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
