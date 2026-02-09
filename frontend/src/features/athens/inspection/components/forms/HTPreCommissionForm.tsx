import React, { useRef } from 'react';
import { Form, Input, Button, DatePicker, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '@common/components/PageLayout';

const HTPreCommissionForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const componentRef = useRef(null);

  const handleCancel = () => {
    navigate('/dashboard/inspection/forms/ht-precommission/list');
  };

  const handleDownload = () => {
    window.print();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await inspectionService.createHTPreCommissionTemplateForm(values);
      message.success("HT Pre-Commission form submitted successfully!");
      navigate('/dashboard/inspection/forms/ht-precommission/list');
    } catch (error) {
      message.error('Failed to submit form');
    }
  };

  return (
    <PageLayout
      title="HT Pre-Commission Checklist"
      subtitle="HT Cable Pre-Commissioning Checklist"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'HT Pre-Commission', href: '/dashboard/inspection/forms/ht-precommission/list' },
        { title: 'Create' }
      ]}
      actions={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>Download</Button>,
        <Button key="cancel" danger icon={<CloseOutlined />} onClick={handleCancel}>Cancel</Button>
      ]}
    >
      <div ref={componentRef} className="max-w-[960px] mx-auto p-6 bg-gray-50 rounded-md shadow-md text-gray-700 font-sans text-sm">
        <Form form={form} layout="vertical">
          {/* HEADER TABLE */}
          <table className="w-full border border-gray-400 border-collapse mb-6">
            <tbody>
              <tr>
                <td rowSpan={6} className="border border-gray-400 text-center align-middle w-[120px]">
                  <img src="/logo.png" alt="Company Logo" className="h-[60px] object-contain mx-auto" />
                </td>
                <td colSpan={2} className="border border-gray-400 text-center font-bold text-base">
                  PROZEAL GREEN ENERGY PVT LTD
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-400">
                  <strong>Document Name:</strong> Pre-Commissioning Checklist
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400">
                  <strong>Format No.:</strong> IMS/FOR/PR/080
                </td>
                <td className="border border-gray-400">
                  <strong>Page No.:</strong> 01
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400">
                  <strong>Issue No.:</strong> 01
                </td>
                <td className="border border-gray-400">
                  <strong>Revision No.:</strong> 00
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400">
                  <strong>Issue Date:</strong> 18-01-2024
                </td>
                <td className="border border-gray-400">
                  <strong>Revision Date:</strong> NA
                </td>
              </tr>
            </tbody>
          </table>

          <h2 className="text-center text-base font-bold my-4">HT CABLE</h2>

          {/* Cable Info */}
          <div className="grid grid-cols-2 gap-x-10 mb-6">
            <Form.Item label="Name of Client" name="client_name">
              <Input />
            </Form.Item>
            <Form.Item label="Location" name="location">
              <Input />
            </Form.Item>
            <Form.Item label="Date of Test" name="date_of_test">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item label="Make" name="make">
              <Input />
            </Form.Item>
            <Form.Item label="Cable Rating" name="cable_rating">
              <Input />
            </Form.Item>
          </div>

          {/* 1. INSULATION RESISTANCE TEST */}
          <h3 className="font-bold mb-2">1. INSULATION RESISTANCE TEST:</h3>
          <table className="w-full border border-gray-400 border-collapse mb-6 text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-400 p-2">Applied Voltage</th>
                <th className="border border-gray-400 p-2">R-E</th>
                <th className="border border-gray-400 p-2">Y-E</th>
                <th className="border border-gray-400 p-2">B-E</th>
                <th className="border border-gray-400 p-2">R-Y</th>
                <th className="border border-gray-400 p-2">Y-B</th>
                <th className="border border-gray-400 p-2">B-R</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2">BEFORE HV TEST</td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="before_r_e" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="before_y_e" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="before_b_e" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="before_r_y" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="before_y_b" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="before_b_r" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2">AFTER HV TEST</td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="after_r_e" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="after_y_e" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="after_b_e" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="after_r_y" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="after_y_b" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
                <td className="border border-gray-400 p-1">
                  <Form.Item name="after_b_r" className="mb-0">
                    <Input className="text-center bg-transparent border-none" />
                  </Form.Item>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Yes/No Remarks */}
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-4">
              <strong>Cables found healthy:</strong>
              <Form.Item name="cables_healthy_1" className="mb-0">
                <Input placeholder="Yes / No" className="w-20" />
              </Form.Item>
            </div>
            <div className="flex items-center gap-4">
              <strong>General Inspection & Erection completion checked:</strong>
              <Form.Item name="general_inspection" className="mb-0">
                <Input placeholder="Yes / No" className="w-20" />
              </Form.Item>
            </div>
            <div>
              <strong>Remarks:</strong>
              <Form.Item name="remarks" className="mt-2">
                <Input.TextArea rows={3} className="min-h-[60px]" />
              </Form.Item>
            </div>
          </div>

          {/* 2. HI-POT TEST */}
          <h3 className="font-bold mb-2">2. HI-POT TEST:</h3>
          <table className="w-full border border-gray-400 border-collapse mb-6 text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-400 p-2"></th>
                <th className="border border-gray-400 p-2">Injected Voltage</th>
                <th className="border border-gray-400 p-2">Leakage Current</th>
                <th className="border border-gray-400 p-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'R - PH', prefix: 'r_ph' },
                { label: 'Y - PH', prefix: 'y_ph' },
                { label: 'B - PH', prefix: 'b_ph' }
              ].map((phase, i) => (
                <tr key={i}>
                  <td className="border border-gray-400 p-2">{phase.label}</td>
                  <td className="border border-gray-400 p-1">
                    <Form.Item name={`${phase.prefix}_voltage`} className="mb-0">
                      <Input className="text-center bg-transparent border-none" />
                    </Form.Item>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <Form.Item name={`${phase.prefix}_current`} className="mb-0">
                      <Input className="text-center bg-transparent border-none" />
                    </Form.Item>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <Form.Item name={`${phase.prefix}_time`} className="mb-0">
                      <Input className="text-center bg-transparent border-none" />
                    </Form.Item>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Final Comments */}
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-4">
              <strong>The cable withstood the test:</strong>
              <Form.Item name="cable_withstood_test" className="mb-0">
                <Input placeholder="Yes / No" className="w-20" />
              </Form.Item>
            </div>
            <div className="flex items-center gap-4">
              <strong>Cables found healthy:</strong>
              <Form.Item name="cables_healthy_2" className="mb-0">
                <Input placeholder="Yes / No" className="w-20" />
              </Form.Item>
            </div>
          </div>

          {/* Final Signature Table */}
          <table className="w-full border border-gray-400 border-collapse text-center mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-400 p-2"></th>
                <th className="border border-gray-400 p-2">Tested By</th>
                <th className="border border-gray-400 p-2">Witnessed By</th>
                <th className="border border-gray-400 p-2">Witnessed By</th>
                <th className="border border-gray-400 p-2">Witnessed By</th>
                <th className="border border-gray-400 p-2">Witnessed By</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Signature', fields: ['tested_by_signature', 'witness1_signature', 'witness2_signature', 'witness3_signature', 'witness4_signature'] },
                { label: 'Name', fields: ['tested_by_name', 'witness1_name', 'witness2_name', 'witness3_name', 'witness4_name'] },
                { label: 'Date', fields: ['tested_by_date', 'witness1_date', 'witness2_date', 'witness3_date', 'witness4_date'] },
                { label: 'Company', fields: ['tested_by_company', 'witness1_company', 'witness2_company', 'witness3_company', 'witness4_company'] }
              ].map((row, i) => (
                <tr key={i}>
                  <td className="border border-gray-400 p-2 font-semibold">{row.label}</td>
                  {row.fields.map((field, j) => (
                    <td key={j} className="border border-gray-400 p-1">
                      <Form.Item name={field} className="mb-0">
                        <Input className="text-center bg-transparent border-none" />
                      </Form.Item>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-center mt-6">
            <Button type="primary" onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              Submit
            </Button>
          </div>
        </Form>
      </div>
    </PageLayout>
  );
};

export default HTPreCommissionForm;