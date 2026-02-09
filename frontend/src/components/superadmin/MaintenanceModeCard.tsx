import { useState, useEffect } from 'react';
import { AlertTriangle, Power } from 'lucide-react';
import { superadminApi } from '@/services/superadmin/superadminApi';
import { toast } from '@/lib/toast';
import { ConfirmActionDialog } from '@/components/superadmin/ConfirmActionDialog';

export default function MaintenanceModeCard() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await superadminApi.settings.getSystem();
      setMaintenanceMode(response.data.maintenance_mode);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load maintenance mode status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const response = await superadminApi.settings.toggleMaintenance();
      setMaintenanceMode(response.data.maintenance_mode);
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to toggle maintenance mode');
    } finally {
      setToggling(false);
      setShowConfirm(false);
    }
  };

  const handleToggleClick = () => {
    if (!maintenanceMode) {
      // Show confirm when enabling
      setShowConfirm(true);
    } else {
      // Disable directly
      handleToggle();
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {maintenanceMode && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-yellow-400 font-semibold mb-1">Maintenance Mode Active</div>
            <div className="text-yellow-300 text-sm">
              The platform is currently in maintenance mode. Users may experience limited access or service interruptions.
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Maintenance Mode</h3>
            <p className="text-sm text-gray-400">
              Enable maintenance mode to restrict platform access during updates
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            maintenanceMode
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {maintenanceMode ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Current Status:</div>
            <div className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${maintenanceMode ? 'text-yellow-400' : 'text-green-400'}`} />
              <span className="text-white font-medium">
                {maintenanceMode ? 'Platform is in maintenance mode' : 'Platform is operational'}
              </span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-sm text-blue-300">
              <strong>Note:</strong> When maintenance mode is enabled:
            </div>
            <ul className="text-sm text-blue-300 mt-2 space-y-1 ml-4 list-disc">
              <li>Regular users will see a maintenance message</li>
              <li>SuperAdmin users can still access the platform</li>
              <li>API endpoints may return maintenance responses</li>
              <li>Scheduled tasks may be paused</li>
            </ul>
          </div>

          <button
            onClick={handleToggleClick}
            disabled={toggling}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              maintenanceMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            } disabled:bg-gray-600`}
          >
            <Power className="w-4 h-4" />
            {toggling ? 'Toggling...' : maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmActionDialog
          open={true}
          title="Enable Maintenance Mode"
          description="Are you sure you want to enable maintenance mode? This will restrict platform access for regular users. SuperAdmin users will still be able to access the platform."
          confirmText="Enable"
          onConfirm={handleToggle}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
