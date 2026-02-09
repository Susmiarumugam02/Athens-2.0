import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
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

export const useThemeStore = create<ThemeState>()((
  persist(
    (set) => ({
      mode: 'light',
      
      setMode: (mode: ThemeMode) => {
        set({ mode })
        applyTheme(mode)
      },
      
      toggleTheme: () => {
        set((state) => {
          const next = state.mode === 'light' ? 'dark' : 'light'
          applyTheme(next)
          return { mode: next }
        })
      },
    }),
    {
      name: 'theme',
    }
  )
))

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
