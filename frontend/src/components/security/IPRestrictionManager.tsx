import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Globe, CheckCircle, XCircle } from 'lucide-react'
import type { IPRestriction } from '../../types'

const ipSchema = z.object({
  ip_address: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP'),
  description: z.string().min(1, 'Required').max(100, 'Too long')
})

type IPFormData = z.infer<typeof ipSchema>

interface IPRestrictionManagerProps {
  restrictions: IPRestriction[]
  isEnabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  onAddIP: (data: { ip_address: string; description: string }) => Promise<void>
  onRemoveIP: (id: number) => Promise<void>
  onToggleIP: (id: number, active: boolean) => Promise<void>
  isLoading?: boolean
}

const IPRestrictionManager: React.FC<IPRestrictionManagerProps> = ({ restrictions, isEnabled, onToggleEnabled, onAddIP, onRemoveIP, onToggleIP, isLoading = false }) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm<IPFormData>({ resolver: zodResolver(ipSchema) })

  const onSubmit = async (data: IPFormData) => {
    await onAddIP(data)
    reset()
    setShowAddForm(false)
  }

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">IP Restrictions</h3>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={isEnabled} onChange={(e) => onToggleEnabled(e.target.checked)} disabled={isLoading} className="sr-only" />
          <div className={`w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
          </div>
          <span className="text-xs text-gray-700 dark:text-gray-300">{isEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {isEnabled && (
        <>
          <div className="mb-3 p-2 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-700/50 rounded-lg text-xs text-yellow-700 dark:text-yellow-300">
            Only specified IPs can access. Add your current IP to avoid lockout.
          </div>

          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Allowed IPs</h4>
            <button onClick={() => setShowAddForm(!showAddForm)} disabled={isLoading} className="flex items-center gap-1.5 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 text-xs">
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleSubmit(onSubmit)} className="mb-3 p-3 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <input {...register('ip_address')} type="text" placeholder="192.168.1.100" className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
                  {errors.ip_address && <p className="text-red-500 text-xs mt-0.5">{errors.ip_address.message}</p>}
                </div>
                <div>
                  <input {...register('description')} type="text" placeholder="Office Network" className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
                  {errors.description && <p className="text-red-500 text-xs mt-0.5">{errors.description.message}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={isLoading} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 text-xs">Add IP</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-xs">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {restrictions.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <Globe className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No IP restrictions configured</p>
              </div>
            ) : (
              restrictions.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`p-1.5 rounded-lg ${r.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {r.is_active ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> : <XCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{r.ip_address}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{r.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onToggleIP(r.id, !r.is_active)} disabled={isLoading} className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${r.is_active ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                      {r.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => onRemoveIP(r.id)} disabled={isLoading} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default IPRestrictionManager