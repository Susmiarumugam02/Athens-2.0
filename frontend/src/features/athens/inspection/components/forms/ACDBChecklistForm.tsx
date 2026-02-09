import React, { useState, useRef } from 'react';
import { Form, Input, Table, Typography, Row, Col, Button, DatePicker, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '@common/components/PageLayout';

const { Title, Text } = Typography;

const firstPageChecklistItems = [
  "Check for site physical layout as per drawing.",
  "Ensure that no fouling with civil / structural.",
  "Check the foundation readiness and level of foundation.",
  "Check for erection of Base frames",
  "Check for the tightness of inters panel bolting.",
  "Ensure the tightness of Bus bars.",
  "Check for Phase to Phase & Phase to earth Clearance",
  "Check for alignment of Breaker",
  "Check for completion of inters panel wiring as drawing.",
  "Check proper earthing as per drawing.",
  "Check that all unused holes are sealed.",
  "Check completion of all wiring & the cable tags and ferrules are provided as per cable schedule.",
  "Check the Busbar tightness",
  "Door alignment",
  "Ensure that the panel is cleaned and closed in all respect.",
  "All above procedure under proper safety surveillance."
];

const secondPageChecklistItems = [
  { description: "Visual inspection, physical inspection of cubicles", type: "Visual" },
  { description: "Alignment of Breaker Panel & Trolleys", type: "Visual / Mechanical" },
  { description: "Earthing of Equipment", type: "Visual" },
  { description: "Control & Power Wiring", type: "Electrical" },
  { description: "Protection / Interlock Schemes", type: "Electrical" },
  { description: "Manual Operation", type: "Mechanical" },
  { description: "Electrical Operation on Control Voltage", type: "Electrical" },
  { description: "Insulation Test Min. Value 200 M. Ohm", type: "Measurement" },
  { description: "CT. Polarity Check", type: "Electrical" },
  { description: "Protection Check, Trial Tripping, Annunciation, Alarms Trials", type: "Electrical" },
  { description: "Switch on No Load", type: "Electrical" },
  { description: "Check Functioning of Indicating Meters", type: "Electrical" },
];

const thirdPageTestItems = [
  { label: "'R' Phase to Earth", unit: "MΩ" },
  { label: "'Y' Phase to Earth", unit: "MΩ" },
  { label: "'B' Phase to Earth", unit: "MΩ" },
  { label: "'R' Phase to 'Y' Phase", unit: "MΩ" },
  { label: "'Y' Phase to 'B' Phase", unit: "MΩ" },
  { label: "'B' Phase to 'R' Phase", unit: "MΩ" },
  { label: "R/Y/B Phase to N bus", unit: "MΩ" },
];

const ACDBChecklistForm: React.FC = () => {
  const [form] = Form.useForm();
  const [currentPage, setCurrentPage] = useState(1);
  const componentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await inspectionService.createACDBChecklistForm(values);
      message.success("ACDB Checklist submitted successfully!");
      navigate("/dashboard/inspection/forms/acdb-checklist/list");
    } catch (error) {
      message.error('Failed to submit form');
    }
  };

  const renderHeader = (pageNo: number) => (
    <div className="bg-white rounded-md shadow border border-gray-400 mb-6 p-4">
      <div className="flex flex-wrap justify-between items-center">
        <div className="w-full md:w-2/3 space-y-2">
          <h2 className="text-lg font-bold text-gray-800 uppercase">
            PROZEAL GREEN ENERGY PVT LTD
          </h2>
          <table className="w-full text-sm border border-black border-collapse">
            <tbody>
              <tr>
                <td className="border border-black font-semibold p-1">Document Name:</td>
                <td className="border border-black p-1" colSpan={3}>Pre-Commissioning Checklist</td>
                <td className="border border-black font-semibold p-1">Page No.:</td>
                <td className="border border-black text-center p-1">{pageNo.toString().padStart(2, '0')}</td>
              </tr>
              <tr>
                <td className="border border-black font-semibold p-1">Format No.:</td>
                <td className="border border-black p-1">IMS/FOR/PR/074</td>
                <td className="border border-black font-semibold p-1">Issue No.:</td>
                <td className="border border-black p-1">01</td>
                <td className="border border-black font-semibold p-1">Revision No.:</td>
                <td className="border border-black text-center p-1">00</td>
              </tr>
              <tr>
                <td className="border border-black font-semibold p-1">Issue Date:</td>
                <td className="border border-black p-1">18-01-2024</td>
                <td className="border border-black font-semibold p-1">Revision Date:</td>
                <td className="border border-black p-1" colSpan={3}>NA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title={`ACDB Checklist - Page ${currentPage}`}
      subtitle="Pre-Commissioning Checklist – LT Swgr / ACDB / DCDB / UPS panel"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'ACDB Checklist', href: '/dashboard/inspection/forms/acdb-checklist/list' },
        { title: 'Create' }
      ]}
      actions={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handlePrint}>Download</Button>,
        <Button key="cancel" danger icon={<CloseOutlined />} onClick={() => navigate('/dashboard/inspection/forms/acdb-checklist/list')}>Cancel</Button>
      ]}
    >
      <div ref={componentRef} className="bg-white p-6 rounded-lg shadow">
        {renderHeader(currentPage)}
        
        {currentPage === 1 && (
          <>
            <Title level={4} className="text-center font-bold underline mb-8">
              LT Swgr / ACDB / DCDB / UPS panel
            </Title>
            <Form layout="vertical" form={form} className="mb-8">
              <Row gutter={32}>
                <Col span={12}>
                  <Form.Item label={<Text strong>Client</Text>} name="client">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Location</Text>} name="location">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Date of Inspection</Text>} name="date_of_inspection">
                    <DatePicker className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Equipment Description</Text>} name="equipment_description">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Equipment Serial No</Text>} name="equipment_serial_no">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Equipment Rating</Text>} name="equipment_rating">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text strong>Ref. Drawing No</Text>} name="ref_drawing_no">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            
            <Table 
              dataSource={firstPageChecklistItems.map((desc, index) => ({ 
                key: index + 1, 
                description: desc,
                remarks: <Form.Item name={`page1_check_${index}`} className="mb-0">
                  <Input placeholder="Enter remarks" />
                </Form.Item>
              }))} 
              columns={[
                { title: 'Sr. No.', dataIndex: 'key', key: 'key', width: 70, align: 'center' as const },
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', width: 200 }
              ]}
              pagination={false} 
              bordered 
              size="middle" 
              rowKey="key" 
            />
            
            <div className="flex justify-center mt-6">
              <Button type="primary" onClick={() => setCurrentPage(2)}>Next</Button>
            </div>
          </>
        )}

        {currentPage === 2 && (
          <>
            <Table 
              dataSource={secondPageChecklistItems.map((item, index) => ({ 
                key: index + 1, 
                description: item.description, 
                type: item.type,
                remarks: <Form.Item name={`page2_check_${index}`} className="mb-0">
                  <Input placeholder="Enter remarks" />
                </Form.Item>
              }))} 
              columns={[
                { title: 'S.No', dataIndex: 'key', key: 'key', width: 70, align: 'center' as const },
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Type', dataIndex: 'type', key: 'type' },
                { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', width: 200 }
              ]}
              pagination={false} 
              bordered 
              size="middle" 
              rowKey="key" 
            />
            
            <div className="flex justify-center mt-6 space-x-4">
              <Button onClick={() => setCurrentPage(1)}>Previous</Button>
              <Button type="primary" onClick={() => setCurrentPage(3)}>Next</Button>
            </div>
          </>
        )}

        {currentPage === 3 && (
          <>
            <Form layout="vertical" className="mb-8">
              {thirdPageTestItems.map(({ label, unit }, index) => (
                <Form.Item 
                  label={<Text strong>{`${index + 1}. ${label}`}</Text>} 
                  key={index} 
                  name={`test_${['r_phase_earth', 'y_phase_earth', 'b_phase_earth', 'r_y_phase', 'y_b_phase', 'b_r_phase', 'ryb_n_bus'][index]}`}
                >
                  <div className="flex items-center">
                    <Input className="w-48 mr-2" />
                    <Text>{unit}</Text>
                  </div>
                </Form.Item>
              ))}
            </Form>
            
            <div className="mb-8">
              <Text strong>NOTE:</Text>
              <ul className="list-disc list-inside text-sm">
                <li>During IT Test isolate neutral link, remove voltmeter, space heater fuses if any.</li>
                <li>Calibration test certificate will be submitted at the time of testing.</li>
                <li>PANELS found healthy: Yes / No</li>
              </ul>
            </div>
            
            <div className="flex justify-center mt-6 space-x-4">
              <Button onClick={() => setCurrentPage(2)}>Previous</Button>
              <Button type="primary" onClick={handleSubmit}>Submit</Button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default ACDBChecklistForm;