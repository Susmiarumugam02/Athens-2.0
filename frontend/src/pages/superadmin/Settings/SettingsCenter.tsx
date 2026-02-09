import { useState } from 'react';
import { Settings as SettingsIcon, AlertTriangle, Database } from 'lucide-react';
import SystemSettingsForm from '@/components/superadmin/SystemSettingsForm';
import MaintenanceModeCard from '@/components/superadmin/MaintenanceModeCard';
import DatabaseBackupsList from '@/components/superadmin/DatabaseBackupsList';

type Tab = 'system' | 'maintenance' | 'backups';

export default function SettingsCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('system');

  const tabs = [
    { id: 'system' as Tab, label: 'System Settings', icon: SettingsIcon },
    { id: 'maintenance' as Tab, label: 'Maintenance Mode', icon: AlertTriangle },
    { id: 'backups' as Tab, label: 'Database Backups', icon: Database },
  ];

  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure platform-wide settings and maintenance</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {activeTab === 'system' && <SystemSettingsForm />}
          {activeTab === 'maintenance' && <MaintenanceModeCard />}
          {activeTab === 'backups' && <DatabaseBackupsList />}
        </div>
      </div>
    
  );
}
