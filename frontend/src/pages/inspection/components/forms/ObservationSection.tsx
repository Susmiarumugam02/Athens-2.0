import React from 'react';
import { Form, Input, Select, Radio } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

const ObservationSection: React.FC = () => (
  <div className="space-y-4">
    <Form.Item
      label="Observations / Issues Found"
      name="observations"
    >
      <TextArea
        rows={3}
        placeholder="Describe any issues or observations found during inspection..."
        showCount
        maxLength={1000}
      />
    </Form.Item>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
      <Form.Item
        label="Risk Level"
        name="risk_level"
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              const obs = getFieldValue('observations');
              if (obs && obs.trim().length > 0 && !value) {
                return Promise.reject('Risk level is required when observations are entered');
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Select placeholder="Select risk level">
          <Option value="low">
            <span className="text-green-600 font-medium">🟢 Low</span>
          </Option>
          <Option value="medium">
            <span className="text-yellow-600 font-medium">🟡 Medium</span>
          </Option>
          <Option value="high">
            <span className="text-red-600 font-medium">🔴 High</span>
          </Option>
        </Select>
      </Form.Item>

      <Form.Item label="Safe for Energization" name="is_safe">
        <Radio.Group buttonStyle="solid">
          <Radio.Button value={true}>✅ Yes</Radio.Button>
          <Radio.Button value={false}>❌ No</Radio.Button>
        </Radio.Group>
      </Form.Item>
    </div>

    <Form.Item label="Corrective Actions" name="corrective_action">
      <TextArea
        rows={3}
        placeholder="Describe corrective actions to be taken..."
        showCount
        maxLength={1000}
      />
    </Form.Item>
  </div>
);

export default ObservationSection;
