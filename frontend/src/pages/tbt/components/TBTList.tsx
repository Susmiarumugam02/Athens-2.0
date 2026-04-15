import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Tag } from 'antd';
import { EyeOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';

interface TBTListProps {
  onView: (tbt: any) => void;
  onEdit: (tbt: any) => void;
}

const TBTList: React.FC<TBTListProps> = ({ onView, onEdit }) => {
  const [tbts, setTbts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchTbts();
  }, []);

  const fetchTbts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/tbt/');
      setTbts(response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch TBTs:', error);
      setTbts([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Topic',
      dataIndex: 'topic',
      key: 'topic',
      filteredValue: [searchText],
      onFilter: (value: any, record: any) =>
        record.topic?.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: 'Conductor',
      dataIndex: 'conductor',
      key: 'conductor',
      width: 150,
    },
    {
      title: 'Attendees',
      dataIndex: 'attendees',
      key: 'attendees',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const color = status === 'completed' ? 'green' : status === 'scheduled' ? 'blue' : 'default';
        return <Tag color={color}>{String(status || 'N/A').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#fff' }}>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by topic"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      <Table
        columns={columns}
        dataSource={tbts}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default TBTList;
