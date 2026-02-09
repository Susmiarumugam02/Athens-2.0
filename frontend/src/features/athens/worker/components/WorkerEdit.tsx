import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Button, Select, DatePicker, Modal, App, Row, Col, Checkbox, Typography } from 'antd';
import { UserOutlined, IdcardOutlined, HomeOutlined, SolutionOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { WorkerData } from '../types';
import moment from 'moment';
import { DEPARTMENTS, DESIGNATIONS_BY_DEPARTMENT } from '../constants';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

// --- Interface Definition (Unchanged) ---
interface WorkerEditProps {
  worker: WorkerData;
  visible: boolean;
  onSave: (updatedWorker: WorkerData) => void;
  onCancel: () => void;
}

// --- Styled Components for Themed UI ---
const FormContainer = styled.div`
  padding: 8px;
  max-height: 70vh;
  overflow-y: auto;
`;
const Section = styled.div` margin-bottom: 32px; `;
const SectionTitle = styled(Title)`
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 24px !important; font-size: 1.1rem !important;
  color: var(--color-text-base) !important;
`;
const FormActionsContainer = styled.div`
  display: flex; justify-content: flex-end; gap: 8px;
  padding-top: 16px; margin-top: 16px;
  border-top: 1px solid var(--color-border);
`;

// --- Component Definition ---
const WorkerEdit: React.FC<WorkerEditProps> = ({ worker, visible, onSave, onCancel }) => {
  const {message} = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [showOtherEducation, setShowOtherEducation] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableDesignations, setAvailableDesignations] = useState<Array<{value: string, label: string}>>([]);

  useEffect(() => {
    if (worker && visible) {
      const isSameAddress = worker.present_address === worker.permanent_address;
      setSameAsPresent(isSameAddress);
      setShowOtherEducation(worker.education_level === 'Other');

      // Set department and available designations
      if (worker.department) {
        setSelectedDepartment(worker.department);
        const designations = DESIGNATIONS_BY_DEPARTMENT[worker.department as keyof typeof DESIGNATIONS_BY_DEPARTMENT] || [];
        setAvailableDesignations(designations);
      }

      form.setFieldsValue({
        ...worker,
        date_of_birth: worker.date_of_birth ? moment(worker.date_of_birth) : null,
        date_of_joining: worker.date_of_joining || worker.joining_date ? moment(worker.date_of_joining || worker.joining_date) : null,
      });
    }
  }, [worker, visible, form]);

  const handleSameAddressChange = useCallback((e: any) => {
    const isChecked = e.target.checked;
    setSameAsPresent(isChecked);
    if (isChecked) form.setFieldsValue({ permanent_address: form.getFieldValue('present_address') });
  }, [form]);

  const handleEducationChange = useCallback((value: string) => setShowOtherEducation(value === 'Other'), []);

  const handleDepartmentChange = useCallback((value: string) => {
    setSelectedDepartment(value);
    const designations = DESIGNATIONS_BY_DEPARTMENT[value as keyof typeof DESIGNATIONS_BY_DEPARTMENT] || [];
    setAvailableDesignations(designations);
    // Clear designation when department changes
    form.setFieldsValue({ designation: undefined });
  }, [form]);

  const handleAlphaInputChange = useCallback((fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (/^[A-Za-z\s]*$/.test(value)) {
      form.setFieldsValue({ [fieldName]: value });
    } else {
      const filteredValue = value.replace(/[^A-Za-z\s]/g, '');
      form.setFieldsValue({ [fieldName]: filteredValue });
    }
  }, [form]);

  const handleNumericInputChange = useCallback((fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (/^\d*$/.test(value)) form.setFieldsValue({ [fieldName]: value });
    else form.setFieldsValue({ [fieldName]: form.getFieldValue(fieldName) });
  }, [form]);

  const handleSave = useCallback(() => {
    form.validateFields()
      .then(values => {
        setLoading(true);
        const formattedValues = {
          ...values, id: worker.id, key: worker.key,
          date_of_birth: values.date_of_birth?.format('YYYY-MM-DD'),
          date_of_joining: values.date_of_joining?.format('YYYY-MM-DD'),
          joining_date: values.date_of_joining?.format('YYYY-MM-DD'),
          permanent_address: sameAsPresent ? values.present_address : values.permanent_address,
        };
        onSave(formattedValues as WorkerData);
        setTimeout(() => setLoading(false), 500);
      })
      .catch(info => {
        message.error('Validation failed. Please check the form.');
      });
  }, [form, worker, onSave, sameAsPresent]);

  return (
    <Modal
      title={<Title level={4} style={{color: 'var(--color-text-base)'}}>Edit Worker Details</Title>}
      open={visible} onCancel={onCancel} footer={null} width={800} destroyOnHidden
    >
      <FormContainer>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          
          <Section><SectionTitle level={4}><UserOutlined />Personal Information</SectionTitle>
            <Row gutter={16}>
                <Col xs={24} sm={12}><Form.Item label="Name" name="name" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces' }]}><Input onChange={handleAlphaInputChange('name')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Surname" name="surname" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces' }]}><Input onChange={handleAlphaInputChange('surname')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Father's/Spouse Name" name="father_or_spouse_name" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces' }]}><Input onChange={handleAlphaInputChange('father_or_spouse_name')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Date of Birth" name="date_of_birth" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabledDate={(c) => c && c > moment().subtract(18, 'years')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Gender" name="gender" rules={[{ required: true }]}><Select><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Nationality" name="nationality" rules={[{ required: true }]}><Input onChange={handleAlphaInputChange('nationality')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Mark of Identification" name="mark_of_identification" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces' }]}><Input onChange={handleAlphaInputChange('mark_of_identification')} /></Form.Item></Col>
            </Row>
          </Section>

          <Section><SectionTitle level={4}><SolutionOutlined />Employment Details</SectionTitle>
            <Row gutter={16}>
                <Col xs={24} sm={12}><Form.Item label="Worker ID" name="worker_id" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Date of Joining" name="date_of_joining" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                    <Select placeholder="Select department" onChange={handleDepartmentChange}>
                      {DEPARTMENTS.map(dept => (
                        <Option key={dept.value} value={dept.value}>{dept.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Designation" name="designation" rules={[{ required: true }]}>
                    <Select placeholder="Select designation" disabled={!selectedDepartment}>
                      {availableDesignations.map(designation => (
                        <Option key={designation.value} value={designation.value}>{designation.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}><Form.Item label="Category" name="category" rules={[{ required: true }]}><Select><Option value="Highly Skilled">Highly Skilled</Option><Option value="Skilled">Skilled</Option><Option value="Semi Skilled">Semi Skilled</Option><Option value="Unskilled">Unskilled</Option></Select></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Employment Type" name="employment_type" rules={[{ required: true }]}><Select><Option value="temporary">Temporary</Option><Option value="permanent">Permanent</Option></Select></Form.Item></Col>
                {/* ** CORRECTED: FULL EDUCATION LIST ** */}
                <Col xs={24} sm={12}><Form.Item label="Education Level" name="education_level" rules={[{ required: true }]}><Select onChange={handleEducationChange}><Option value="No Formal Education">No Formal Education</Option><Option value="High School Diploma / Equivalent">High School Diploma / Equivalent</Option><Option value="Vocational Training / Certification">Vocational Training / Certification</Option><Option value="Associate Degree">Associate Degree</Option><Option value="Bachelor's Degree">Bachelor's Degree</Option><Option value="Master's Degree">Master's Degree</Option><Option value="Doctorate / PhD">Doctorate / PhD</Option><Option value="Other">Other (Please specify)</Option></Select></Form.Item></Col>
                {showOtherEducation && <Col xs={24} sm={12}><Form.Item label="Other (Specify)" name="other_education"><Input /></Form.Item></Col>}
                 {/* ** CORRECTED: MISSING STATUS FIELDS ** */}
                <Col xs={24} sm={12}><Form.Item label="Status" name="status" rules={[{ required: true }]}><Select><Option value="active">Active</Option><Option value="inactive">Inactive</Option><Option value="on_leave">On Leave</Option></Select></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Employment Status" name="employment_status" rules={[{ required: true }]}><Select><Option value="initiated">Initiated</Option><Option value="deployed">Deployed</Option><Option value="terminated">Terminated</Option><Option value="site_transferred">Site Transferred</Option></Select></Form.Item></Col>
            </Row>
          </Section>
          
          <Section><SectionTitle level={4}><IdcardOutlined />Identity & Contact</SectionTitle>
            <Row gutter={16}>
                <Col xs={24} sm={12}><Form.Item label="Mobile Number" name="phone_number" rules={[{ required: true }, { len: 10, message: 'Must be 10 digits' }]}><Input maxLength={10} onChange={handleNumericInputChange('phone_number')} onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) { e.preventDefault(); } }} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Aadhaar" name="aadhaar" rules={[{ required: true }, { len: 12, message: 'Must be 12 digits' }]}><Input maxLength={12} onChange={handleNumericInputChange('aadhaar')} onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) { e.preventDefault(); } }} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="UAN" name="uan" rules={[{ pattern: /^\d*$/, message: 'Only numbers allowed'}, { len: 12, message: 'Must be 12 digits' }]}><Input maxLength={12} onChange={handleNumericInputChange('uan')} onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) { e.preventDefault(); } }} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="PAN" name="pan" rules={[{ pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Invalid PAN' }]}><Input maxLength={10} style={{textTransform: 'uppercase'}}/></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="ESIC IP" name="esic_ip"><Input /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="LWF" name="lwf"><Input /></Form.Item></Col>
            </Row>
          </Section>

          <Section><SectionTitle level={4}><HomeOutlined />Address</SectionTitle>
            <Row gutter={16}>
                <Col span={24}><Form.Item label="Present Address" name="present_address" rules={[{ required: true }]}><TextArea rows={3} /></Form.Item></Col>
                <Col span={24}><Form.Item><Checkbox checked={sameAsPresent} onChange={handleSameAddressChange}>Permanent Address is same as Present Address</Checkbox></Form.Item></Col>
                <Col span={24}><Form.Item label="Permanent Address" name="permanent_address" rules={[{ required: true }]}><TextArea rows={3} disabled={sameAsPresent} /></Form.Item></Col>
            </Row>
          </Section>

          <FormActionsContainer>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Save Changes</Button>
          </FormActionsContainer>
        </Form>
      </FormContainer>
    </Modal>
  );
};

export default WorkerEdit;