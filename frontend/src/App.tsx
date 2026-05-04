import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
// Legacy Athens CSS removed - SAP design system active
// import './App.css'

function App() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [])

  return null
}

export default App
