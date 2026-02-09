import { useState } from 'react';
import { Shield, Lock, Globe, Clock, Activity } from 'lucide-react';
import PasswordPolicyForm from '@/components/superadmin/PasswordPolicyForm';
import TwoFactorSettingsForm from '@/components/superadmin/TwoFactorSettingsForm';
import IPRestrictionsList from '@/components/superadmin/IPRestrictionsList';
import SessionSettingsForm from '@/components/superadmin/SessionSettingsForm';
import ActiveSessionsList from '@/components/superadmin/ActiveSessionsList';

type Tab = 'password' | '2fa' | 'ip' | 'sessions' | 'active-sessions';

export default function SecurityCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('password');

  const tabs = [
    { id: 'password' as Tab, label: 'Password Policy', icon: Lock },
    { id: '2fa' as Tab, label: '2FA Settings', icon: Shield },
    { id: 'ip' as Tab, label: 'IP Restrictions', icon: Globe },
    { id: 'sessions' as Tab, label: 'Session Settings', icon: Clock },
    { id: 'active-sessions' as Tab, label: 'Active Sessions', icon: Activity },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Center</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage security policies and restrictions</p>
      </div>

      {/* Single Premium Window */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg overflow-hidden h-[calc(100vh-12rem)]">
        {/* Sidebar + Content Layout */}
        <div className="flex h-full">
          {/* Left Sidebar Navigation */}
          <div className="w-48 border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-3 flex-shrink-0">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'password' && <PasswordPolicyForm />}
            {activeTab === '2fa' && <TwoFactorSettingsForm />}
            {activeTab === 'ip' && <IPRestrictionsList />}
            {activeTab === 'sessions' && <SessionSettingsForm />}
            {activeTab === 'active-sessions' && <ActiveSessionsList />}
          </div>
        </div>
      </div>
    </div>
  );
}
