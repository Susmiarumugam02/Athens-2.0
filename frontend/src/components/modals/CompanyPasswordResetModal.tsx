import React, { useState } from 'react'
import { Key, Download, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '../ui/AppDialog'
import { Button } from '../ui/Button'
import { apiClient } from '../../lib/api'

interface CompanyPasswordResetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: any
}

const CompanyPasswordResetModal: React.FC<CompanyPasswordResetModalProps> = ({
  open,
  onOpenChange,
  company
}) => {
  const [loading, setLoading] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [credentialsData, setCredentialsData] = useState<any>(null)

  const handleResetPassword = async () => {
    try {
      setLoading(true)
      const response = await apiClient.resetCompanyPassword(company.id)
      if (response.data) {
        setCredentialsData(response.data)
        setResetComplete(true)
        toast.success('Password reset successfully!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCredentials = () => {
    if (!credentialsData) return
    const text = `Company: ${company.name}\nEmail: ${company.email}\nPassword: ${credentialsData.credentials?.password}\nGenerated: ${new Date().toLocaleString()}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${company.name.replace(/\s+/g, '_')}_credentials.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded')
  }

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md">
      <AppDialogHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
            <Key className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <AppDialogTitle>Reset Company Password</AppDialogTitle>
            <AppDialogDescription>{company?.name}</AppDialogDescription>
          </div>
        </div>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} />
      </AppDialogHeader>
      <AppDialogBody>
        {!resetComplete ? (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">Security Warning</h3>
                  <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                    <li>• Generates new temporary password</li>
                    <li>• Company must change password on next login</li>
                    <li>• Current sessions remain active</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Company Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium">{company?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="font-medium">{company?.email}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">


            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Password Reset Complete</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">New password generated for {company?.name}</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">New Credentials</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-mono">{company?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Password:</span>
                  <span className="font-mono bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded">
                    {credentialsData?.credentials?.password}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </AppDialogBody>
      <AppDialogFooter>
        {!resetComplete ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleDownloadCredentials}>
              <Download className="h-4 w-4 mr-2" />Download
            </Button>
          </>
        )}
      </AppDialogFooter>
    </AppDialog>
  )
}

export default CompanyPasswordResetModal