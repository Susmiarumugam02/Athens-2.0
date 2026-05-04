import React, { useState } from 'react';
import { Card, List, Button, Space, Tag, Typography, Modal, Descriptions, Alert } from 'antd';
import { 
  WarningOutlined, CheckOutlined, CloseOutlined, 
  MergeCellsOutlined, DeleteOutlined 
} from '@ant-design/icons';
import { useOfflineSync } from '../hooks/useOfflineSync2';
import type { QueueItem, FieldConflict } from '../types/offlineSync';

const { Title, Text, Paragraph } = Typography;

export const SyncConflictsPage: React.FC = () => {
  const { getConflicts, resolveConflict, removeFromQueue } = useOfflineSync();
  const conflicts = getConflicts();
  const [selectedConflict, setSelectedConflict] = useState<QueueItem | null>(null);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);

  const handleResolve = (item: QueueItem, resolution: 'keep_mine' | 'use_server' | 'merge') => {
    if (resolution === 'merge') {
      setSelectedConflict(item);
      setMergeModalVisible(true);
    } else {
      resolveConflict(item.offline_id, resolution);
    }
  };

  const handleMerge = (item: QueueItem) => {
    if (!item.conflict) return;

    // Auto-merge based on hints
    const mergedData = { ...item.payload };
    
    if (item.conflict.fields) {
      Object.entries(item.conflict.fields).forEach(([field, conflict]) => {
        const fieldConflict = conflict as FieldConflict;
        if (fieldConflict.merge_hint === 'set_merge') {
          // Union merge for arrays/sets
          const clientSet = new Set(Array.isArray(fieldConflict.client) ? fieldConflict.client : []);
          const serverSet = new Set(Array.isArray(fieldConflict.server) ? fieldConflict.server : []);
          mergedData[field] = Array.from(new Set([...clientSet, ...serverSet]));
        } else if (fieldConflict.merge_hint === 'true_wins') {
          // For boolean-like fields, true wins
          if (typeof fieldConflict.client === 'object' && typeof fieldConflict.server === 'object') {
            const merged: any = {};
            const allKeys = new Set([
              ...Object.keys(fieldConflict.client || {}),
              ...Object.keys(fieldConflict.server || {})
            ]);
            allKeys.forEach(key => {
              merged[key] = fieldConflict.server[key] || fieldConflict.client[key];
            });
            mergedData[field] = merged;
          }
        }
      });
    }

    resolveConflict(item.offline_id, 'merge', mergedData);
    setMergeModalVisible(false);
    setSelectedConflict(null);
  };

  const getReasonTag = (reason: string) => {
    const colors: Record<string, string> = {
      stale_version: 'orange',
      invalid_transition: 'red',
      validation_error: 'red',
      missing_client_version: 'gold'
    };
    return <Tag color={colors[reason] || 'default'}>{reason.replace(/_/g, ' ')}</Tag>;
  };

  if (conflicts.length === 0) {
    return (
      <Card>
        <Alert
          message="No Conflicts"
          description="All offline changes have been synced successfully."
          type="success"
          showIcon
          icon={<CheckOutlined />}
        />
      </Card>
    );
  }

  return (
    <div>
      <Title level={3}>
        <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
        Sync Conflicts ({conflicts.length})
      </Title>
      <Paragraph type="secondary">
        These offline changes conflict with server data. Choose how to resolve each conflict.
      </Paragraph>

      <List
        dataSource={conflicts}
        renderItem={(item) => (
          <Card 
            key={item.id}
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <Tag color="blue">{item.entity}</Tag>
                {item.conflict && getReasonTag(item.conflict.reason)}
              </Space>
            }
            extra={
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => removeFromQueue(item.offline_id)}
              >
                Discard
              </Button>
            }
          >
            {item.conflict && (
              <>
                <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Client Version">
                    {item.conflict.client_version || 'Unknown'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Server Version">
                    {item.conflict.server_version}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created">
                    {new Date(item.created_at).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Attempts">
                    {item.attempts}
                  </Descriptions.Item>
                </Descriptions>

                {item.conflict.detail && (
                  <Alert 
                    message={item.conflict.detail} 
                    type="warning" 
                    style={{ marginBottom: 16 }}
                    showIcon
                  />
                )}

                {item.conflict.fields && Object.keys(item.conflict.fields).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Conflicting Fields:</Text>
                    <List
                      size="small"
                      dataSource={Object.entries(item.conflict.fields)}
                      renderItem={([field, conflict]) => {
                        const fieldConflict = conflict as FieldConflict;
                        return (
                          <List.Item>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Text strong>{field}</Text>
                              <Space>
                                <Tag>Your value: {JSON.stringify(fieldConflict.client)}</Tag>
                                <Tag color="blue">Server value: {JSON.stringify(fieldConflict.server)}</Tag>
                                <Tag color="green">{fieldConflict.merge_hint}</Tag>
                              </Space>
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  </div>
                )}

                <Space>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => handleResolve(item, 'keep_mine')}
                  >
                    Keep Mine
                  </Button>
                  <Button
                    icon={<CloseOutlined />}
                    onClick={() => handleResolve(item, 'use_server')}
                  >
                    Use Server
                  </Button>
                  {item.conflict.fields && Object.keys(item.conflict.fields).length > 0 && (
                    <Button
                      icon={<MergeCellsOutlined />}
                      onClick={() => handleResolve(item, 'merge')}
                    >
                      Auto Merge
                    </Button>
                  )}
                </Space>
              </>
            )}
          </Card>
        )}
      />

      <Modal
        title="Confirm Auto Merge"
        open={mergeModalVisible}
        onOk={() => selectedConflict && handleMerge(selectedConflict)}
        onCancel={() => {
          setMergeModalVisible(false);
          setSelectedConflict(null);
        }}
      >
        <Alert
          message="Auto-merge will combine your changes with server changes using smart merge strategies."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Text>This will:</Text>
        <ul>
          <li>Merge arrays/sets by union</li>
          <li>For checklists, keep items marked as done from either version</li>
          <li>Preserve both client and server changes where possible</li>
        </ul>
      </Modal>
    </div>
  );
};
