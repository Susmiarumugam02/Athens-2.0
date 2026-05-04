import { useState, useEffect } from 'react'
import { useProjectContext } from '../../store/projectContext'

interface Project {
  id: number
  name: string
  code: string
}

export default function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([])
  const { selectedProject, setSelectedProject } = useProjectContext()

  useEffect(() => {
    // Load projects from API
    // For now, mock data
    setProjects([
      { id: 1, name: 'Project Alpha', code: 'PA' },
      { id: 2, name: 'Project Beta', code: 'PB' },
    ])
  }, [])

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Project
      </label>
      <select
        value={selectedProject?.id || ''}
        onChange={(e) => {
          const project = projects.find(p => p.id === Number(e.target.value))
          setSelectedProject(project || null)
        }}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        <option value="">-- Select a Project --</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name} ({project.code})
          </option>
        ))}
      </select>
      {!selectedProject && (
        <p className="mt-2 text-sm text-orange-600">
          Please select a project to manage ERGON and Workforce modules
        </p>
      )}
    </div>
  )
}
