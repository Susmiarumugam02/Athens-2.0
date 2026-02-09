import React, { useState } from "react";
import { Input, Button, Checkbox, Form, DatePicker, message } from "antd";
import { useNavigate } from "react-router-dom";
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '@common/components/PageLayout';

const checklistData = [
  "Should be tight fixed and all fasteners are applied",
  "Table to Table earth strip should be 25x6 GI Strip",
  "Check the zinc paint on GI strip edges on both sides",
  "Earth strip should be fix in stripkit in both tables",
  "Earth strip should be proper touch the table",
  "Earth strip cutting after strip should be piling at sharp edges",
  "Close the earth strip in underground in possible area",
  "Removal of scraps from the area & clean the area."
];

const EarthingChecklistForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      await inspectionService.createEarthingChecklistForm(values);
      message.success("✅ Earthing Checklist submitted successfully!");
      navigate("/dashboard/inspection/forms/earthing-checklist/list");
    } catch (error) {
      message.error('Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard/inspection/forms/earthing-checklist/list");
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <PageLayout
      title="Table to Table Earthing Checklist"
      subtitle="Table to Table Earthing Checklist"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'Earthing Checklist', href: '/dashboard/inspection/forms/earthing-checklist/list' },
        { title: 'Create' }
      ]}
      actions={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>Download PDF</Button>,
        <Button key="cancel" danger icon={<CloseOutlined />} onClick={handleCancel}>Cancel</Button>
      ]}
    >
      <div className="max-w-6xl mx-auto p-8 bg-white font-sans text-sm text-gray-900 border border-gray-400 shadow-md rounded-md">
        <Form form={form} layout="vertical">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-500 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Logo" className="h-12" />
              <h2 className="font-bold text-base uppercase text-gray-800">
                Table to Table Earthing Checklist
              </h2>
            </div>
            <div className="text-xs leading-5 text-gray-700">
              <div className="border-b border-gray-300 pb-1"><strong>Form No.:</strong> IMS/FOR/PR/038</div>
              <div className="border-b border-gray-300 py-1"><strong>Rev.:</strong> 00</div>
              <div className="pt-1"><strong>Date:</strong> 14.03.2024</div>
            </div>
          </div>

          {/* Info Table */}
          <table className="w-full border border-gray-400 border-collapse text-xs mb-6">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">Project:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="project" className="mb-0">
                    <Input variant="borderless" className="border-b border-gray-400 rounded-none px-1" />
                  </Form.Item>
                </td>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">Date:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="date" className="mb-0">
                    <DatePicker variant="borderless" className="border-b border-gray-400 rounded-none px-1 w-full" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">Block No:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="block_no" className="mb-0">
                    <Input variant="borderless" className="border-b border-gray-400 rounded-none px-1" />
                  </Form.Item>
                </td>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">Serial No:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="serial_no" className="mb-0">
                    <Input variant="borderless" className="border-b border-gray-400 rounded-none px-1" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">Equipment Make:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="equipment_make" className="mb-0">
                    <Input variant="borderless" className="border-b border-gray-400 rounded-none px-1" />
                  </Form.Item>
                </td>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">Calibration Date:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="calibration_date" className="mb-0">
                    <DatePicker variant="borderless" className="border-b border-gray-400 rounded-none px-1 w-full" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">RFI No:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="rfi_no" className="mb-0">
                    <Input variant="borderless" className="border-b border-gray-400 rounded-none px-1" />
                  </Form.Item>
                </td>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 w-1/4">Ref Drg No:</td>
                <td className="border border-gray-300 p-2 w-1/4">
                  <Form.Item name="ref_drg_no" className="mb-0">
                    <Input variant="borderless" className="border-b border-gray-400 rounded-none px-1" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="border border-gray-300 p-2 text-xs italic bg-gray-50">
                  <strong>Sampling:</strong> 10% of total check by QA and 100% by Execution Engineer
                </td>
              </tr>
            </tbody>
          </table>

          {/* Checklist Table */}
          <table className="w-full border border-gray-400 border-collapse text-xs mb-6">
            <thead className="bg-gray-100 text-center font-semibold">
              <tr>
                <th className="border border-gray-400 p-2 w-[5%]">Sr. No.</th>
                <th className="border border-gray-400 p-2 text-left w-[55%]">Description</th>
                <th className="border border-gray-400 p-2 w-[10%]">Yes</th>
                <th className="border border-gray-400 p-2 w-[10%]">No</th>
                <th className="border border-gray-400 p-2 w-[10%]">N/A</th>
                <th className="border border-gray-400 p-2 text-left w-[10%]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {checklistData.map((desc, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{desc}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    <Form.Item name={`check_${index}_yes`} className="mb-0" valuePropName="checked">
                      <Checkbox />
                    </Form.Item>
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    <Form.Item name={`check_${index}_no`} className="mb-0" valuePropName="checked">
                      <Checkbox />
                    </Form.Item>
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    <Form.Item name={`check_${index}_na`} className="mb-0" valuePropName="checked">
                      <Checkbox />
                    </Form.Item>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <Form.Item name={`check_${index}_remarks`} className="mb-0">
                      <Input
                        placeholder="Remarks"
                        variant="borderless"
                        className="border-b border-gray-400 rounded-none px-1 py-1"
                      />
                    </Form.Item>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Note */}
          <div className="border border-gray-300 p-2 text-xs italic bg-yellow-100 mb-6">
            <strong>Note:</strong> The acceptance of various parameters as above shall be as per relevant drawings issued from Engineering.
          </div>

          {/* Signature Section */}
          <table className="w-full text-xs text-center border border-gray-400 border-collapse mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-400 p-2"></th>
                <th className="border border-gray-400 p-2">Contractor</th>
                <th className="border border-gray-400 p-2">Execution Team</th>
                <th className="border border-gray-400 p-2">QA/QC Team</th>
              </tr>
            </thead>
            <tbody>
              {['Signature', 'Name', 'Date'].map((label, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="border border-gray-300 p-2 bg-gray-50 font-medium">{label}</td>
                  <td className="border border-gray-300 p-2">
                    <Form.Item name={`contractor_${label.toLowerCase()}`} className="mb-0">
                      <Input
                        placeholder={label}
                        variant="borderless"
                        className="text-center border-b border-gray-400 rounded-none px-1 py-1"
                      />
                    </Form.Item>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <Form.Item name={`execution_${label.toLowerCase()}`} className="mb-0">
                      <Input
                        placeholder={label}
                        variant="borderless"
                        className="text-center border-b border-gray-400 rounded-none px-1 py-1"
                      />
                    </Form.Item>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <Form.Item name={`qa_${label.toLowerCase()}`} className="mb-0">
                      <Input
                        placeholder={label}
                        variant="borderless"
                        className="text-center border-b border-gray-400 rounded-none px-1 py-1"
                      />
                    </Form.Item>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center gap-4">
            <Button
              onClick={handleCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-md transition duration-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition duration-300"
            >
              Download PDF
            </Button>
            <Button
              type="primary"
              loading={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-md transition duration-300"
              onClick={handleSubmit}
            >
              Submit
            </Button>
          </div>
        </Form>
      </div>
    </PageLayout>
  );
};

export default EarthingChecklistForm;