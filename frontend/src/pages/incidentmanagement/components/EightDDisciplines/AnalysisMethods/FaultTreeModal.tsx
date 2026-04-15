import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Card, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

interface FaultEvent {
  id: string;
  description: string;
  type: 'primary' | 'intermediate' | 'basic';
  gate: 'AND' | 'OR' | 'none';
}

interface FaultTreeModalProps {
  visible: boolean;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const FaultTreeModal: React.FC<FaultTreeModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [events, setEvents] = useState<FaultEvent[]>([
    { id: '1', description: '', type: 'primary', gate: 'none' }
  ]);

  const addEvent = () => {
    const newId = (events.length + 1).toString();
    setEvents([...events, { id: newId, description: '', type: 'basic', gate: 'none' }]);
  };

  const removeEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id));
  };

  const updateEvent = (id: string, field: keyof FaultEvent, value: any) => {
    setEvents(events.map(event => 
      event.id === id ? { ...event, [field]: value } : event
    ));
  };

  const handleSubmit = () => {
    onSubmit({
      method_type: 'fault_tree',
      method_data: { events },
    });
  };

  return (
    <Modal
      title="Fault Tree Analysis"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {events.map((event, index) => (
          <Card 
            key={event.id} 
            size="small" 
            style={{ marginBottom: 16 }}
            title={`Event ${index + 1}`}
            extra={
              events.length > 1 && (
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => removeEvent(event.id)}
                />
              )
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="Event description"
                value={event.description}
                onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
              />
              
              <Space>
                <Select
                  value={event.type}
                  onChange={(value) => updateEvent(event.id, 'type', value)}
                  style={{ width: 120 }}
                >
                  <Option value="primary">Primary</Option>
                  <Option value="intermediate">Intermediate</Option>
                  <Option value="basic">Basic</Option>
                </Select>
                
                <Select
                  value={event.gate}
                  onChange={(value) => updateEvent(event.id, 'gate', value)}
                  style={{ width: 100 }}
                >
                  <Option value="none">None</Option>
                  <Option value="AND">AND</Option>
                  <Option value="OR">OR</Option>
                </Select>
              </Space>
            </Space>
          </Card>
        ))}

        <Button 
          type="dashed" 
          onClick={addEvent} 
          icon={<PlusOutlined />}
          style={{ width: '100%', marginBottom: 16 }}
        >
          Add Event
        </Button>

        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Save Analysis
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default FaultTreeModal;