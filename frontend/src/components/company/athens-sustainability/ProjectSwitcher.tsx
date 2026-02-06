import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { athensSustCompanyApi, type AthensSustProject } from '../../../services/athensSustCompanyApi'
import { Select } from '../../ui/Select'
import { LoadingSpinner } from '../../ui/LoadingSpinner'

const STORAGE_KEY = 'ATHENS_SUST_SELECTED_PROJECT'

interface ProjectSwitcherProps {
  allowAll?: boolean
  onChange?: (projectId: number | null) => void
  className?: string
  enabled?: boolean
}

const normalizeProjectList = (data: any): AthensSustProject[] => {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.results || []
}

const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({ allowAll = true, onChange, className = '', enabled = true }) => {
  const storedValue = localStorage.getItem(STORAGE_KEY)
  const [selectedValue, setSelectedValue] = React.useState<string>(storedValue || (allowAll ? 'all' : ''))

  const { data, isLoading, isError } = useQuery({
    queryKey: ['athens-sust-projects'],
    queryFn: () => athensSustCompanyApi.listProjects({ status: 'active' }),
    enabled
  })

  const projects = normalizeProjectList(data)

  React.useEffect(() => {
    if (!projects.length) return
    if (selectedValue === 'all' && allowAll) return

    const exists = projects.some((project) => project.id.toString() === selectedValue)
    if (!exists) {
      const fallback = allowAll ? 'all' : projects[0].id.toString()
      setSelectedValue(fallback)
    }
  }, [projects, selectedValue, allowAll])

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedValue)
    if (selectedValue === 'all') {
      onChange?.(null)
      return
    }
    const parsed = Number(selectedValue)
    onChange?.(Number.isNaN(parsed) ? null : parsed)
  }, [selectedValue, onChange])

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <LoadingSpinner size="sm" text="Loading projects..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        Unable to load projects. Try again.
      </div>
    )
  }

  if (!projects.length) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No projects found. Create your first project to continue.
      </div>
    )
  }

  return (
    <div className={className}>
      <Select
        value={selectedValue}
        onChange={(value) => setSelectedValue(value)}
        options={[
          ...(allowAll ? [{ value: 'all', label: 'All Projects' }] : []),
          ...projects.map((project) => ({
            value: project.id.toString(),
            label: project.name
          }))
        ]}
      />
    </div>
  )
}

export default ProjectSwitcher
