import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  theme: ThemeMode // Alias for mode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  toggleTheme: () => void // Alias for toggleMode
}

const applyTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.toggle('dark', systemTheme === 'dark')
    }
  } else {
    root.classList.toggle('dark', mode === 'dark')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      
      get theme() {
        return get().mode
      },
      
      setMode: (mode: ThemeMode) => {
        set({ mode })
        applyTheme(mode)
      },
      
      toggleMode: () => {
        const current = get().mode
        const next = current === 'light' ? 'dark' : 'light'
        set({ mode: next })
        applyTheme(next)
      },
      
      toggleTheme: () => {
        get().toggleMode()
      },
    }),
    {
      name: 'theme',
    }
  )
)

// Initialize theme on load
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    const stored = localStorage.getItem('theme')
    const mode = stored ? JSON.parse(stored).state.mode : 'light'
    applyTheme(mode)
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentMode = useThemeStore.getState().mode
        if (currentMode === 'system') {
          applyTheme('system')
        }
      })
    }
  } catch (error) {
    console.warn('Theme initialization failed:', error)
    applyTheme('light')
  }
}
