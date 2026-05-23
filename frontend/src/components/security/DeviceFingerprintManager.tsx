import React from 'react'
import { Monitor, Smartphone, Trash2 } from 'lucide-react'
import type { DeviceFingerprint } from '../../types'

interface DeviceFingerprintManagerProps {
  devices: DeviceFingerprint[]
  isEnabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  onRemoveDevice: (deviceId: string) => Promise<void>
  onToggleTrust: (deviceId: string, trusted: boolean) => Promise<void>
  isLoading?: boolean
}

const DeviceFingerprintManager: React.FC<DeviceFingerprintManagerProps> = ({ devices, isEnabled, onToggleEnabled, onRemoveDevice, onToggleTrust, isLoading = false }) => {
  const getDeviceIcon = (deviceInfo: string) => {
    const info = deviceInfo.toLowerCase()
    return info.includes('mobile') || info.includes('android') || info.includes('iphone') ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />
  }

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Monitor className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Device Fingerprinting</h3>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={isEnabled} onChange={(e) => onToggleEnabled(e.target.checked)} disabled={isLoading} className="sr-only" />
          <div className={`w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
          </div>
          <span className="text-xs text-gray-700 dark:text-gray-300">{isEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {isEnabled && (
        <>
          <div className="mb-3 p-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/50 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            New devices detected. Trusted devices skip 2FA.
          </div>

          <div className="space-y-2">
            {devices.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <Monitor className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No devices detected yet</p>
              </div>
            ) : (
              devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`p-1.5 rounded-lg ${device.is_trusted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {React.cloneElement(getDeviceIcon(device.device_name), {
                        className: `h-4 w-4 ${device.is_trusted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`
                      })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{device.device_name}</p>
                        {device.is_trusted && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full flex-shrink-0">Trusted</span>}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{device.browser} • {device.os}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.ip_address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => onToggleTrust(device.id, !device.is_trusted)} disabled={isLoading} className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${device.is_trusted ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                      {device.is_trusted ? 'Untrust' : 'Trust'}
                    </button>
                    <button onClick={() => onRemoveDevice(device.id)} disabled={isLoading} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50">
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

export default DeviceFingerprintManager