import React from 'react';
import { Radio, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

export type ChecklistValue = 'ok' | 'not_ok' | 'na';

export interface ChecklistState {
  insulation_condition: ChecklistValue;
  termination: ChecklistValue;
  routing: ChecklistValue;
  identification: ChecklistValue;
  mechanical_damage: ChecklistValue;
  moisture: ChecklistValue;
  earthing: ChecklistValue;
}

export const DEFAULT_CHECKLIST: ChecklistState = {
  insulation_condition: 'na',
  termination: 'na',
  routing: 'na',
  identification: 'na',
  mechanical_damage: 'na',
  moisture: 'na',
  earthing: 'na',
};

const CHECKLIST_LABELS: Record<keyof ChecklistState, string> = {
  insulation_condition: 'Insulation Condition',
  termination: 'Cable Termination (Gland)',
  routing: 'Routing Condition',
  identification: 'Identification Tags',
  mechanical_damage: 'Mechanical Damage',
  moisture: 'Moisture Exposure',
  earthing: 'Earthing Availability',
};

// Critical items — NOT OK on these blocks submission
export const CRITICAL_CHECKLIST_KEYS: (keyof ChecklistState)[] = [
  'insulation_condition',
  'earthing',
  'moisture',
];

interface Props {
  checklist: ChecklistState;
  onChange: (key: keyof ChecklistState, value: ChecklistValue) => void;
}

const ChecklistSection: React.FC<Props> = ({ checklist, onChange }) => (
  <div className="space-y-3">
    {/* Header row */}
    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1 border-b border-gray-200">
      <div className="col-span-5">Item</div>
      <div className="col-span-7 flex gap-4 justify-end pr-2">
        <span className="w-16 text-center text-green-600">OK</span>
        <span className="w-16 text-center text-red-500">NOT OK</span>
        <span className="w-16 text-center text-gray-400">N/A</span>
      </div>
    </div>

    {(Object.keys(CHECKLIST_LABELS) as (keyof ChecklistState)[]).map((key) => {
      const val = checklist[key];
      const isCritical = CRITICAL_CHECKLIST_KEYS.includes(key);
      const isNotOk = val === 'not_ok';

      return (
        <div
          key={key}
          className={`grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg transition-colors ${
            isNotOk ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
          }`}
        >
          <div className="col-span-5 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {CHECKLIST_LABELS[key]}
            </span>
            {isCritical && (
              <Tag color="orange" className="text-xs">Critical</Tag>
            )}
          </div>

          <div className="col-span-7 flex gap-4 justify-end pr-2">
            <Radio.Group
              value={val}
              onChange={(e) => onChange(key, e.target.value)}
              className="flex gap-4"
            >
              <Radio value="ok">
                <CheckCircleOutlined className="text-green-500" />
              </Radio>
              <Radio value="not_ok">
                <CloseCircleOutlined className={isNotOk ? 'text-red-500' : 'text-gray-400'} />
              </Radio>
              <Radio value="na">
                <MinusCircleOutlined className="text-gray-400" />
              </Radio>
            </Radio.Group>
          </div>
        </div>
      );
    })}
  </div>
);

export default ChecklistSection;
