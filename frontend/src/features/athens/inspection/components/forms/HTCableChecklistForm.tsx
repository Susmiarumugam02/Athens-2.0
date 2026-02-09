import React, { useRef } from 'react';
import { Form, Input, Button, DatePicker, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '@common/components/PageLayout';

const checkPoints = [
  "Check the IR value of cable before laying",
  "Check for physical damage of the cables",
  "Check cable make, size, voltage grade, conductor & insulation type as per design/specifications",
  "Check Cable route as per drawing",
  "Check spacing between cables is as per approved drawing",
  "No twists, knots or kinks",
  "Check for proper Dressing of the cables",
  "Check that cable bending radius is as per IS standards",
  "Check the Blocks alignment & distance between blocks",
  "Adequate looping at the termination ends",
  "Check for Hume Pipes at road crossing as per drawing",
  "Check the tightness of cable terminations at connection points",
  "Check for Phase sequence identification",
  "Check for Earthing Connections provided",
  "Cable identification tags at termination ends"
];

const HTCableChecklistForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const componentRef = useRef(null);

  const handleCancel = () => {
    navigate('/dashboard/inspection/forms/ht-cable/list');
  };

  const handleDownload = () => {
    window.print();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await inspectionService.createHTCableForm(values);
      message.success("HT Cable Checklist submitted successfully!");
      navigate('/dashboard/inspection/forms/ht-cable/list');
    } catch (error) {
      message.error('Failed to submit form');
    }
  };

  return (
    <PageLayout
      title="HT Cable Checklist"
      subtitle="Inverter Room/Control Room Building Final Acceptance Checklist"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'HT Cable Checklist', href: '/dashboard/inspection/forms/ht-cable/list' },
        { title: 'Create' }
      ]}
      actions={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>Download</Button>,
        <Button key="cancel" danger icon={<CloseOutlined />} onClick={handleCancel}>Cancel</Button>
      ]}
    >
      <div ref={componentRef} className="bg-white p-6 rounded-lg shadow">
        <Form form={form} layout="vertical">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Form.Item label="Project Name" name="project_name">
              <Input />
            </Form.Item>
            <Form.Item label="Location/Area" name="location_area">
              <Input />
            </Form.Item>
            <Form.Item label="Date of Audit" name="date_of_audit">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          {/* Checklist Table */}
          <table className="w-full border border-gray-400 border-collapse text-sm mb-6">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-400 p-2 w-16">S. No.</th>
                <th className="border border-gray-400 p-2">Check Parameter</th>
                <th className="border border-gray-400 p-2 w-32">Criteria</th>
                <th className="border border-gray-400 p-2 w-32">Observation</th>
                <th className="border border-gray-400 p-2 w-48">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {checkPoints.map((point, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 p-2">{point}</td>
                  <td className="border border-gray-300 p-1">
                    <Input size="small" className="border-0" />
                  </td>
                  <td className="border border-gray-300 p-1">
                    <Input size="small" className="border-0" />
                  </td>
                  <td className="border border-gray-300 p-1">
                    <Form.Item name={`check_${idx}`} className="mb-0">
                      <Input size="small" className="border-0" placeholder="Enter remarks" />
                    </Form.Item>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center">
            <Button type="primary" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </Form>
      </div>
    </PageLayout>
  );
};

export default HTCableChecklistForm;