import React from 'react'
import { useAuthStore } from '../../store/authStore'
import PostInductionPasswordChange from '../../pages/user/PostInductionPasswordChange'

interface AuthWrapperProps {
  children: React.ReactNode
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { mustChangePassword, setMustChangePassword, refreshCurrentUser } = useAuthStore()

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false)
    void refreshCurrentUser()
  }

  return (
    <>
      {children}
      {mustChangePassword && (
        <PostInductionPasswordChange onSuccess={handlePasswordChangeSuccess} />
      )}
    </>
  )
}

export default AuthWrapper
