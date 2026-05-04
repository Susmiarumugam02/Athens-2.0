import React from 'react';
import { Form, Input, Select, DatePicker } from 'antd';

const { Option } = Select;

interface Props {
  inspectorName: string;
}

const VOLTAGE_OPTIONS = ['230V', '415V', '11kV', '33kV', '66kV', '132kV'];
const CABLE_TYPE_OPTIONS = ['XLPE', 'PVC', 'Armoured', 'Other'];

const GeneralInfoSection: React.FC<Props> = ({ inspectorName }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
    <Form.Item
      label="Title"
      name="title"
      rules={[{ required: true, message: 'Title is required' }]}
    >
      <Input placeholder="AC CABLE TESTING - Site Name" />
    </Form.Item>

    <Form.Item
      label="Location / Block No."
      name="block_no"
      rules={[{ required: true, message: 'Location is required' }]}
    >
      <Input placeholder="e.g. Block A, Zone 3" />
    </Form.Item>

    <Form.Item
      label="Cable ID / Tag Number"
      name="cable_id"
      rules={[{ required: true, message: 'Cable ID is required' }]}
    >
      <Input placeholder="e.g. CB-001-A" />
    </Form.Item>

    <Form.Item
      label="Cable Size / From–To"
      name="cable_size"
    >
      <Input placeholder="e.g. 4C×16mm² / MDB to DB-01" />
    </Form.Item>

    <Form.Item
      label="Voltage Rating"
      name="voltage_rating"
      rules={[{ required: true, message: 'Voltage rating is required' }]}
    >
      <Select placeholder="Select voltage">
        {VOLTAGE_OPTIONS.map(v => <Option key={v} value={v}>{v}</Option>)}
      </Select>
    </Form.Item>

    <Form.Item
      label="Cable Type"
      name="cable_type"
      rules={[{ required: true, message: 'Cable type is required' }]}
    >
      <Select placeholder="Select cable type">
        {CABLE_TYPE_OPTIONS.map(t => <Option key={t} value={t}>{t}</Option>)}
      </Select>
    </Form.Item>

    <Form.Item
      label="Inspection Date"
      name="date"
      rules={[{ required: true, message: 'Inspection date is required' }]}
    >
      <DatePicker style={{ width: '100%' }} />
    </Form.Item>

    <Form.Item label="Inspector">
      <Input value={inspectorName} disabled />
    </Form.Item>

    <Form.Item label="Ref. Drawing No." name="ref_drg_no">
      <Input placeholder="e.g. DRG-EL-001" />
    </Form.Item>

    <Form.Item label="Contractor" name="contractor">
      <Input placeholder="Contractor name" />
    </Form.Item>
  </div>
);

export default GeneralInfoSection;
