import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tabs, Table, DatePicker, Space, Button, message } from 'antd';
import { WarningOutlined, ClockCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import { getReportsSummary, getReportsExceptions, bulkExportExcel } from '../api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const PTWReports: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [exceptions, setExceptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        date_from: dateRange[0].format('YYYY-MM-DD'),
        date_to: dateRange[1].format('YYYY-MM-DD')
      };
      const [summaryRes, exceptionsRes] = await Promise.all([
        getReportsSummary(params),
        getReportsExceptions(params)
      ]);
      setSummary(summaryRes.data);
      setExceptions(exceptionsRes.data);
    } catch (error) {
      message.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await bulkExportExcel({
        use_filters: true,
        detailed: true
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ptw_report_${dayjs().format('YYYYMMDD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Report exported successfully');
    } catch (error) {
      message.error('Failed to export report');
    }
  };

  const exceptionColumns = [
    {
      title: 'Permit Number',
      dataIndex: 'permit_number',
      key: 'permit_number',
      render: (text: string, record: any) => (
        <Button type="link" onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}>
          {text}
        </Button>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => status.toUpperCase()
    },
    {
      title: 'Age (hours)',
      dataIndex: 'age_hours',
      key: 'age_hours',
      render: (hours: number) => hours ? `${hours.toFixed(1)}h` : 'N/A'
    },
    {
      title: 'Planned End',
      dataIndex: 'planned_end_time',
      key: 'planned_end_time',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : 'N/A'
    }
  ];

  return (
    <div>
      <Card 
        title="PTW Compliance Reports"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              format="YYYY-MM-DD"
            />
            <Button icon={<FileExcelOutlined />} onClick={handleExport}>
              Export Excel
            </Button>
          </Space>
        }
      >
        {summary && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Overdue Verification"
                    value={summary.overdue?.verification || 0}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<WarningOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Overdue Approval"
                    value={summary.overdue?.approval || 0}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<WarningOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Expiring Soon"
                    value={summary.expiring_soon || 0}
                    valueStyle={{ color: '#faad14' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Incident Rate"
                    value={summary.incident_rate || 0}
                    precision={2}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Isolation Pending"
                    value={summary.isolation_pending || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Closeout Pending"
                    value={summary.closeout_pending || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}

        {exceptions && (
          <Tabs defaultActiveKey="overdue_verification">
            <TabPane tab={`Overdue Verification (${exceptions.overdue_verification?.length || 0})`} key="overdue_verification">
              <Table
                dataSource={exceptions.overdue_verification || []}
                columns={exceptionColumns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab={`Overdue Approval (${exceptions.overdue_approval?.length || 0})`} key="overdue_approval">
              <Table
                dataSource={exceptions.overdue_approval || []}
                columns={exceptionColumns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab={`Isolation Pending (${exceptions.isolation_pending?.length || 0})`} key="isolation_pending">
              <Table
                dataSource={exceptions.isolation_pending || []}
                columns={exceptionColumns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab={`Closeout Pending (${exceptions.closeout_pending?.length || 0})`} key="closeout_pending">
              <Table
                dataSource={exceptions.closeout_pending || []}
                columns={exceptionColumns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab={`Expiring Soon (${exceptions.expiring_soon?.length || 0})`} key="expiring_soon">
              <Table
                dataSource={exceptions.expiring_soon || []}
                columns={[
                  ...exceptionColumns,
                  {
                    title: 'Hours Left',
                    dataIndex: 'hours_left',
                    key: 'hours_left',
                    render: (hours: number) => hours ? `${hours.toFixed(1)}h` : 'N/A'
                  }
                ]}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        )}
      </Card>
    </div>
  );
};

export default PTWReports;
