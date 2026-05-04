import React from 'react';
import { Badge, Button, Dropdown, Space, Typography, Progress } from 'antd';
import { 
  SyncOutlined, CloudOutlined, CloudServerOutlined, 
  WarningOutlined, CheckCircleOutlined 
} from '@ant-design/icons';
import { useOfflineSync } from '../hooks/useOfflineSync2';
import type { MenuProps } from 'antd';

const { Text } = Typography;

export const SyncStatusIndicator: React.FC = () => {
  const { syncStatus, syncNow, clearSynced, getConflicts } = useOfflineSync();

  const menuItems: MenuProps['items'] = [
    {
      key: 'status',
      label: (
        <Space direction="vertical" style={{ padding: '8px 0' }}>
          <Text strong>Sync Status</Text>
          <Text type="secondary">
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </Text>
          {syncStatus.lastSync && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
            </Text>
          )}
        </Space>
      ),
      disabled: true
    },
    { type: 'divider' },
    {
      key: 'sync',
      label: 'Sync Now',
      icon: <SyncOutlined />,
      disabled: !syncStatus.isOnline || syncStatus.isSyncing || syncStatus.pendingCount === 0,
      onClick: () => syncNow()
    },
    {
      key: 'conflicts',
      label: `View Conflicts (${syncStatus.conflictCount})`,
      icon: <WarningOutlined />,
      disabled: syncStatus.conflictCount === 0,
      onClick: () => window.location.href = '/dashboard/ptw/sync-conflicts'
    },
    {
      key: 'clear',
      label: 'Clear Synced',
      icon: <CheckCircleOutlined />,
      onClick: () => clearSynced()
    }
  ];

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return <CloudServerOutlined style={{ color: '#ff4d4f' }} />;
    }
    if (syncStatus.isSyncing) {
      return <SyncOutlined spin style={{ color: '#1890ff' }} />;
    }
    if (syncStatus.conflictCount > 0) {
      return <WarningOutlined style={{ color: '#faad14' }} />;
    }
    return <CloudOutlined style={{ color: '#52c41a' }} />;
  };

  const getBadgeCount = () => {
    if (syncStatus.conflictCount > 0) return syncStatus.conflictCount;
    if (syncStatus.pendingCount > 0) return syncStatus.pendingCount;
    return 0;
  };

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button type="text" style={{ padding: '4px 8px' }}>
        <Badge count={getBadgeCount()} offset={[5, 0]} size="small">
          <Space>
            {getStatusIcon()}
            {syncStatus.isSyncing && (
              <Progress
                type="circle"
                percent={syncStatus.syncProgress}
                width={20}
                strokeWidth={8}
                format={() => ''}
              />
            )}
          </Space>
        </Badge>
      </Button>
    </Dropdown>
  );
};
