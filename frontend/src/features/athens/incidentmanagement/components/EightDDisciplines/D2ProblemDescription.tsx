import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Alert, 
  Form, 
  Input, 
  message,
  Row,
  Col,
  Typography
} from 'antd';

const { Text } = Typography;
import { FileTextOutlined } from '@ant-design/icons';
import api from '../../../../common/utils/axiosetup';

const { TextArea } = Input;

interface D2ProblemDescriptionProps {
  processId: string;
  onComplete: () => void;
  isCompleted: boolean;
}

const D2ProblemDescription: React.FC<D2ProblemDescriptionProps> = ({
  processId,
  onComplete,
  isCompleted,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [problemData, setProblemData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadProblemData = async () => {
    try {
      const response = await api.get(`/api/v1/incidentmanagement/8d-processes/${processId}/`);
      setProblemData(response.data);
      form.setFieldsValue({
        problem_statement: response.data.problem_statement,
      });
    } catch (error) {
    }
  };

  useEffect(() => {
    if (processId) {
      loadProblemData();
    }
  }, [processId]);

  useEffect(() => {
    // Show editing form initially if no problem statement exists
    if (problemData && !problemData.problem_statement) {
      setIsEditing(true);
    }
  }, [problemData]);

  const handleUpdateProblem = async (values: any) => {
    setLoading(true);
    try {
      await api.patch(`/api/v1/incidentmanagement/8d-processes/${processId}/`, {
        problem_statement: values.problem_statement,
      });
      message.success('Problem statement updated successfully');
      setIsEditing(false);
      loadProblemData();
    } catch (error) {
      message.error('Failed to update problem statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          D2: Describe the Problem
        </Space>
      }
      extra={
        !isCompleted && (
          <Button
            type="primary"
            onClick={onComplete}
            style={{ backgroundColor: '#52c41a' }}
          >
            Complete D2
          </Button>
        )
      }
    >
      <Alert
        message="D2 Objective"
        description="Define the problem in measurable terms. Specify the problem by identifying what, where, when, who, why, how, and how many (5W2H) for the problem."
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
      />

      {isEditing || !problemData?.problem_statement ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateProblem}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="problem_statement"
                label="Problem Statement"
                rules={[
                  { required: true, message: 'Please provide a problem statement' },
                  { min: 20, message: 'Problem statement must be at least 20 characters' }
                ]}
              >
                <TextArea
                  rows={6}
                  placeholder="Describe the problem using 5W2H method:
• What is the problem?
• Where does it occur?
• When does it occur?
• Who is affected?
• Why is it a problem?
• How does it manifest?
• How many instances/frequency?"
                  disabled={isCompleted}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Update Problem Statement
              </Button>
              {isEditing && (
                <Button onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      ) : (
        <div>
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>Problem Statement:</Text>
                <div style={{ 
                  marginTop: 8, 
                  padding: 12, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {problemData?.problem_statement}
                </div>
              </div>
            </Col>
          </Row>
          
          {!isCompleted && (
            <Button 
              type="default" 
              onClick={() => setIsEditing(true)}
              style={{ marginBottom: 16 }}
            >
              Edit Problem Statement
            </Button>
          )}
        </div>
      )}

      {isCompleted && (
        <Alert
          message="D2 Completed"
          description="The problem has been clearly defined and documented."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default D2ProblemDescription;