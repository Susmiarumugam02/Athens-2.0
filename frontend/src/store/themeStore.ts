import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme } from '../types'
import { densityManager } from '../utils/densityManager'
import type { DensityMode } from '../utils/densityManager'

interface ThemeState {
  theme: Theme
  density: DensityMode
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  toggleDensity: () => void
  setDensity: (density: DensityMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      density: densityManager.get(),
      
      toggleTheme: () => {
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        }))
      },
      
      setTheme: (theme: Theme) => {
        set({ theme })
      },

      toggleDensity: () => {
        const newDensity = densityManager.toggle()
        set({ density: newDensity })
      },

      setDensity: (density: DensityMode) => {
        densityManager.set(density)
        set({ density })
      },
    }),
    {
      name: 'theme-storage',
    }
  )
)
