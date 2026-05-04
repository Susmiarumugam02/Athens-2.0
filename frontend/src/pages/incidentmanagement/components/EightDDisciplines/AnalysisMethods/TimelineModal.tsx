import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Card, Row, Col, TimePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface TimelineEvent {
  time: string;
  event: string;
  significance: string;
}

interface TimelineModalProps {
  visible: boolean;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TimelineModal: React.FC<TimelineModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [events, setEvents] = useState<TimelineEvent[]>([
    { time: '', event: '', significance: '' }
  ]);

  const addEvent = () => {
    setEvents([...events, { time: '', event: '', significance: '' }]);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, field: keyof TimelineEvent, value: string) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    setEvents(newEvents);
  };

  const handleSubmit = () => {
    onSubmit({
      method_type: 'timeline',
      method_data: { events },
    });
  };

  return (
    <Modal
      title="Timeline Analysis"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {events.map((event, index) => (
          <Card 
            key={index} 
            size="small" 
            style={{ marginBottom: 16 }}
            title={`Event ${index + 1}`}
            extra={
              events.length > 1 && (
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => removeEvent(index)}
                />
              )
            }
          >
            <Row gutter={16}>
              <Col span={6}>
                <Input
                  placeholder="Time (e.g., 09:30)"
                  value={event.time}
                  onChange={(e) => updateEvent(index, 'time', e.target.value)}
                />
              </Col>
              <Col span={10}>
                <Input
                  placeholder="What happened?"
                  value={event.event}
                  onChange={(e) => updateEvent(index, 'event', e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Input
                  placeholder="Significance"
                  value={event.significance}
                  onChange={(e) => updateEvent(index, 'significance', e.target.value)}
                />
              </Col>
            </Row>
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

export default TimelineModal;