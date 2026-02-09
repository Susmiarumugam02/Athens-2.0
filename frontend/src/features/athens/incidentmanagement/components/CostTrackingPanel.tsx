import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { IncidentCostCenter, COST_CATEGORIES } from '../types';
import api from '../services/api';

const { Option } = Select;
const { Title } = Typography;

interface CostTrackingPanelProps {
  incidentId: string;
  canManageFinancials?: boolean;
  canApprove?: boolean;
}

const CostTrackingPanel: React.FC<CostTrackingPanelProps> = ({
  incidentId,
  canManageFinancials = false,
  canApprove = false,
}) => {
  const [costs, setCosts] = useState<IncidentCostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCost, setEditingCost] = useState<IncidentCostCenter | null>(null);
  const [form] = Form.useForm();

  // Load cost data
  const loadCosts = async () => {
    setLoading(true);
    try {
      const data = await api.costs.getCostCenters(incidentId);
      setCosts(data);
    } catch (error) {
      message.error('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCosts();
  }, [incidentId]);

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      if (editingCost) {
        await api.costs.updateCostEntry(editingCost.id, values);
        message.success('Cost entry updated successfully');
      } else {
        await api.costs.addCostEntry(incidentId, values);
        message.success('Cost entry added successfully');
      }
      setModalVisible(false);
      setEditingCost(null);
      form.resetFields();
      loadCosts();
    } catch (error) {
      message.error('Failed to save cost entry');
    }
  };

  // Handle approval
  const handleApprove = async (costId: string) => {
    try {
      await api.costs.approveCostEntry(costId);
      message.success('Cost entry approved');
      loadCosts();
    } catch (error) {
      message.error('Failed to approve cost entry');
    }
  };

  // Handle delete
  const handleDelete = async (costId: string) => {
    try {
      await api.costs.deleteCostEntry(costId);
      message.success('Cost entry deleted');
      loadCosts();
    } catch (error) {
      message.error('Failed to delete cost entry');
    }
  };

  // Open edit modal
  const openEditModal = (cost: IncidentCostCenter) => {
    setEditingCost(cost);
    form.setFieldsValue(cost);
    setModalVisible(true);
  };

  // Calculate totals
  const totalEstimated = costs.reduce((sum, cost) => sum + (cost.estimated_amount || 0), 0);
  const totalActual = costs.reduce((sum, cost) => sum + (cost.actual_amount || 0), 0);
  const approvedCosts = costs.filter(cost => cost.approved_at).length;
  const pendingApproval = costs.filter(cost => cost.requires_approval && !cost.approved_at).length;

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">
          {COST_CATEGORIES.find(c => c.value === category)?.label || category}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Estimated',
      dataIndex: 'estimated_amount',
      key: 'estimated_amount',
      render: (amount: number) => amount ? `$${amount.toLocaleString()}` : '-',
    },
    {
      title: 'Actual',
      dataIndex: 'actual_amount',
      key: 'actual_amount',
      render: (amount: number) => amount ? `$${amount.toLocaleString()}` : '-',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: IncidentCostCenter) => {
        if (record.approved_at) {
          return <Tag color="green">Approved</Tag>;
        } else if (record.requires_approval) {
          return <Tag color="orange">Pending Approval</Tag>;
        } else {
          return <Tag color="blue">Recorded</Tag>;
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: IncidentCostCenter) => (
        <Space>
          {canManageFinancials && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          )}
          {canApprove && record.requires_approval && !record.approved_at && (
            <Button
              type="text"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record.id)}
            />
          )}
          {canManageFinancials && (
            <Popconfirm
              title="Are you sure you want to delete this cost entry?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          Cost Tracking
        </Space>
      }
      extra={
        canManageFinancials && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Add Cost
          </Button>
        )
      }
    >
      {/* Cost Summary */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Statistic
            title="Total Estimated"
            value={totalEstimated}
            prefix="$"
            precision={2}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="Total Actual"
            value={totalActual}
            prefix="$"
            precision={2}
            valueStyle={{ color: totalActual > totalEstimated ? '#ff4d4f' : '#52c41a' }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="Approved Costs"
            value={approvedCosts}
            suffix={`/ ${costs.length}`}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="Pending Approval"
            value={pendingApproval}
            valueStyle={{ color: pendingApproval > 0 ? '#faad14' : '#52c41a' }}
          />
        </Col>
      </Row>

      {/* Budget vs Actual Progress */}
      {totalEstimated > 0 && (
        <Row style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Title level={5}>Budget vs Actual</Title>
            <Progress
              percent={Math.min((totalActual / totalEstimated) * 100, 100)}
              status={totalActual > totalEstimated ? 'exception' : 'active'}
              format={() => `$${totalActual.toLocaleString()} / $${totalEstimated.toLocaleString()}`}
            />
          </Col>
        </Row>
      )}

      {/* Cost Table */}
      <Table
        columns={columns}
        dataSource={costs}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      {/* Add/Edit Cost Modal */}
      <Modal
        title={editingCost ? 'Edit Cost Entry' : 'Add Cost Entry'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCost(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="category"
            label="Cost Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category">
              {COST_CATEGORIES.map(category => (
                <Option key={category.value} value={category.value}>
                  {category.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe the cost..." />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="estimated_amount"
                label="Estimated Amount"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  precision={2}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="actual_amount"
                label="Actual Amount"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  precision={2}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="department_charged"
                label="Department Charged"
              >
                <Input placeholder="Department to charge" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="requires_approval"
                label="Requires Approval"
                valuePropName="checked"
              >
                <Select placeholder="Requires approval?">
                  <Option value={true}>Yes</Option>
                  <Option value={false}>No</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCost ? 'Update' : 'Add'} Cost
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CostTrackingPanel;
