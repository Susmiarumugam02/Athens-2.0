import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Project {
  id: number
  name: string
  code: string
}

interface ProjectContextState {
  selectedProject: Project | null
  setSelectedProject: (project: Project | null) => void
  clearProject: () => void
}

export const useProjectContext = create<ProjectContextState>()(
  persist(
    (set) => ({
      selectedProject: null,
      setSelectedProject: (project) => set({ selectedProject: project }),
      clearProject: () => set({ selectedProject: null }),
    }),
    {
      name: 'masteradmin-project-context',
    }
  )
)
