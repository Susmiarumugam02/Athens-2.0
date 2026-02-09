import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Space, Typography, Divider, Tag } from 'antd';
import { IdcardOutlined, PhoneOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * Example component demonstrating Worker Identity and Contact field validation
 * Shows how Aadhaar uniqueness validation works
 */
const WorkerIdentityExample: React.FC = () => {
  const [form] = Form.useForm();
  const [validationResults, setValidationResults] = useState<any>({});

  // Example existing workers data (simulating database)
  const existingWorkers = [
    { id: 'WRK-0001', name: 'John Doe', aadhaar: '123456789012', pan: 'ABCDE1234F', uan: '100123456789', phone: '9876543210' },
    { id: 'WRK-0002', name: 'Jane Smith', aadhaar: '987654321098', pan: 'FGHIJ5678K', uan: '200987654321', phone: '8765432109' },
    { id: 'WRK-0003', name: 'Bob Johnson', aadhaar: '456789123456', pan: 'KLMNO9012P', uan: '300456789123', phone: '7654321098' }
  ];

  const validateField = (fieldName: string, value: string) => {
    const results = { ...validationResults };
    
    switch (fieldName) {
      case 'aadhaar':
        if (!value) {
          results.aadhaar = { status: 'error', message: 'Aadhaar number is required' };
        } else if (!/^\d{12}$/.test(value)) {
          results.aadhaar = { status: 'error', message: 'Aadhaar must be exactly 12 digits' };
        } else {
          const existing = existingWorkers.find(w => w.aadhaar === value);
          if (existing) {
            results.aadhaar = { 
              status: 'error', 
              message: `This Aadhaar is already registered with ${existing.name} (${existing.id})` 
            };
          } else {
            results.aadhaar = { status: 'success', message: 'Aadhaar number is available' };
          }
        }
        break;
        
      case 'pan':
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          results.pan = { status: 'error', message: 'Invalid PAN format (e.g., ABCDE1234F)' };
        } else if (value) {
          const existing = existingWorkers.find(w => w.pan === value);
          if (existing) {
            results.pan = { 
              status: 'error', 
              message: `This PAN is already registered with ${existing.name} (${existing.id})` 
            };
          } else {
            results.pan = { status: 'success', message: 'PAN number is available' };
          }
        } else {
          delete results.pan;
        }
        break;
        
      case 'uan':
        if (value && !/^\d{12}$/.test(value)) {
          results.uan = { status: 'error', message: 'UAN must be exactly 12 digits' };
        } else if (value) {
          const existing = existingWorkers.find(w => w.uan === value);
          if (existing) {
            results.uan = { 
              status: 'error', 
              message: `This UAN is already registered with ${existing.name} (${existing.id})` 
            };
          } else {
            results.uan = { status: 'success', message: 'UAN number is available' };
          }
        } else {
          delete results.uan;
        }
        break;
        
      case 'phone_number':
        if (!value) {
          results.phone_number = { status: 'error', message: 'Phone number is required' };
        } else if (!/^[6-9]\d{9}$/.test(value)) {
          results.phone_number = { status: 'error', message: 'Enter valid 10-digit number starting with 6, 7, 8, or 9' };
        } else {
          const existing = existingWorkers.find(w => w.phone === value);
          if (existing) {
            results.phone_number = { 
              status: 'error', 
              message: `This phone number is already registered with ${existing.name} (${existing.id})` 
            };
          } else {
            results.phone_number = { status: 'success', message: 'Phone number is available' };
          }
        }
        break;
    }
    
    setValidationResults(results);
  };

  const handleInputChange = (fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    validateField(fieldName, value);
  };

  const getValidationStatus = (fieldName: string) => {
    const result = validationResults[fieldName];
    return result?.status || '';
  };

  const getValidationMessage = (fieldName: string) => {
    const result = validationResults[fieldName];
    return result?.message || '';
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <Card>
        <Title level={3}>
          <IdcardOutlined /> Worker Identity & Contact Validation Example
        </Title>
        
        <Alert
          message="Identity Document Uniqueness Validation"
          description="This example demonstrates how the system prevents duplicate identity documents. Try entering the existing Aadhaar numbers below to see the validation in action."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Existing Workers Reference */}
        <Card size="small" style={{ marginBottom: 24, background: '#f9f9f9' }}>
          <Title level={5}>Existing Workers in System:</Title>
          {existingWorkers.map(worker => (
            <div key={worker.id} style={{ marginBottom: 8 }}>
              <Tag color="blue">{worker.id}</Tag>
              <Text strong>{worker.name}</Text>
              <Text type="secondary" style={{ marginLeft: 16 }}>
                Aadhaar: {worker.aadhaar} | PAN: {worker.pan} | UAN: {worker.uan} | Phone: {worker.phone}
              </Text>
            </div>
          ))}
        </Card>

        <Form form={form} layout="vertical">
          <Title level={4}>
            <PhoneOutlined /> Contact Information
          </Title>
          
          <Form.Item
            label="Mobile Number"
            validateStatus={getValidationStatus('phone_number')}
            help={getValidationMessage('phone_number')}
          >
            <Input
              placeholder="Enter 10-digit mobile number"
              maxLength={10}
              onChange={handleInputChange('phone_number')}
              suffix={
                getValidationStatus('phone_number') === 'success' ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                getValidationStatus('phone_number') === 'error' ?
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> : null
              }
            />
          </Form.Item>

          <Divider />

          <Title level={4}>
            <IdcardOutlined /> Identity Documents
          </Title>

          <Form.Item
            label="Aadhaar Number (Required & Unique)"
            validateStatus={getValidationStatus('aadhaar')}
            help={getValidationMessage('aadhaar')}
            extra="Try entering: 123456789012 (already exists) or 111111111111 (new)"
          >
            <Input
              placeholder="Enter 12-digit Aadhaar number"
              maxLength={12}
              onChange={handleInputChange('aadhaar')}
              suffix={
                getValidationStatus('aadhaar') === 'success' ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                getValidationStatus('aadhaar') === 'error' ?
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> : null
              }
            />
          </Form.Item>

          <Form.Item
            label="PAN Number (Optional but Unique)"
            validateStatus={getValidationStatus('pan')}
            help={getValidationMessage('pan')}
            extra="Try entering: ABCDE1234F (already exists) or ZZZZZ9999Z (new)"
          >
            <Input
              placeholder="Enter PAN (e.g., ABCDE1234F)"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
              onChange={handleInputChange('pan')}
              suffix={
                getValidationStatus('pan') === 'success' ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                getValidationStatus('pan') === 'error' ?
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> : null
              }
            />
          </Form.Item>

          <Form.Item
            label="UAN Number (Optional but Unique)"
            validateStatus={getValidationStatus('uan')}
            help={getValidationMessage('uan')}
            extra="Try entering: 100123456789 (already exists) or 999888777666 (new)"
          >
            <Input
              placeholder="Enter 12-digit UAN"
              maxLength={12}
              onChange={handleInputChange('uan')}
              suffix={
                getValidationStatus('uan') === 'success' ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                getValidationStatus('uan') === 'error' ?
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> : null
              }
            />
          </Form.Item>
        </Form>

        <Alert
          message="Validation Rules Summary"
          description={
            <div>
              <Paragraph>
                <Text strong>Aadhaar:</Text> Required, 12 digits, must be unique across all workers
              </Paragraph>
              <Paragraph>
                <Text strong>PAN:</Text> Optional, format ABCDE1234F, must be unique if provided
              </Paragraph>
              <Paragraph>
                <Text strong>UAN:</Text> Optional, 12 digits, must be unique if provided
              </Paragraph>
              <Paragraph>
                <Text strong>Phone:</Text> Required, 10 digits starting with 6/7/8/9, must be unique
              </Paragraph>
            </div>
          }
          type="warning"
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
};

export default WorkerIdentityExample;
