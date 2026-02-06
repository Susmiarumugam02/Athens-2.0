import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import './App.css'

function App() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [])

  return null
}

export default App
