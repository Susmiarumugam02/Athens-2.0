import React from 'react';
import { Form, InputNumber, Select, Alert, Divider } from 'antd';

const { Option } = Select;

export const IR_THRESHOLD = 1.0; // MΩ — below this is unsafe

interface Props {
  irPhasePhase: number | null;
  irPhaseEarth: number | null;
}

const TestingSection: React.FC<Props> = ({ irPhasePhase, irPhaseEarth }) => {
  const irWarning =
    (irPhasePhase !== null && irPhasePhase < IR_THRESHOLD) ||
    (irPhaseEarth !== null && irPhaseEarth < IR_THRESHOLD);

  return (
    <div className="space-y-4">
      {/* A. Insulation Resistance */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-3">
          A. Insulation Resistance (IR Test)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <Form.Item
            label="Phase–Phase Value (MΩ)"
            name="ir_phase_phase"
            rules={[
              {
                type: 'number',
                min: 0,
                message: 'Must be a positive number',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="e.g. 500"
              step={0.1}
              precision={3}
              status={irPhasePhase !== null && irPhasePhase < IR_THRESHOLD ? 'error' : undefined}
            />
          </Form.Item>

          <Form.Item
            label="Phase–Earth Value (MΩ)"
            name="ir_phase_earth"
            rules={[
              {
                type: 'number',
                min: 0,
                message: 'Must be a positive number',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="e.g. 500"
              step={0.1}
              precision={3}
              status={irPhaseEarth !== null && irPhaseEarth < IR_THRESHOLD ? 'error' : undefined}
            />
          </Form.Item>
        </div>

        {irWarning && (
          <Alert
            type="error"
            showIcon
            message={`IR value below threshold (${IR_THRESHOLD} MΩ) — cable flagged as NOT SAFE for energization.`}
            className="mb-4"
          />
        )}
      </div>

      <Divider className="my-2" />

      {/* B–E */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <Form.Item label="B. Continuity Test" name="continuity_test">
          <Select placeholder="Select result">
            <Option value="pass">✅ Pass</Option>
            <Option value="fail">❌ Fail</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="C. Earth Continuity (Ω)"
          name="earth_continuity_ohms"
          rules={[{ type: 'number', min: 0, message: 'Must be a positive number' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="e.g. 0.5"
            step={0.001}
            precision={3}
          />
        </Form.Item>

        <Form.Item label="D. High Voltage Test (optional)" name="hv_test_value">
          <InputNumber
            style={{ width: '100%' }}
            placeholder="kV value"
            step={0.1}
          />
        </Form.Item>

        <Form.Item label="E. Phase Sequence" name="phase_sequence">
          <Select placeholder="Select result">
            <Option value="correct">✅ Correct</Option>
            <Option value="incorrect">❌ Incorrect</Option>
          </Select>
        </Form.Item>
      </div>
    </div>
  );
};

export default TestingSection;
