import { useState } from 'react';
import { Bell, Send } from 'lucide-react';
import AnnouncementsList from './AnnouncementsList';
import DeliveryTrackingTable from '@/components/superadmin/DeliveryTrackingTable';

type Tab = 'announcements' | 'delivery';

export default function NotificationsCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('announcements');

  const tabs = [
    { id: 'announcements' as Tab, label: 'Announcements', icon: Bell },
    { id: 'delivery' as Tab, label: 'Delivery Tracking', icon: Send },
  ];

  return (
    
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage platform announcements and track delivery</p>
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
        {activeTab === 'announcements' && <AnnouncementsList />}
        {activeTab === 'delivery' && <DeliveryTrackingTable />}
      </div>
    
  );
}
