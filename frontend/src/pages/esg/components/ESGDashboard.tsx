import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Spin, Alert, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  EnvironmentOutlined, 
  ThunderboltOutlined, 
  DeleteOutlined,
  SafetyOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { getGenerationSummary, getEmissionsSummary } from '../services/esgAPI';
import PageLayout from '../../../components/ui/PageLayout';

interface DashboardStats {
  todayGeneration: number;
  monthGeneration: number;
  totalEmissions: number;
  wasteRecycled: number;
  complianceScore: number;
  safetyScore: number;
}

const ESGDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayGeneration: 0,
    monthGeneration: 0,
    totalEmissions: 0,
    wasteRecycled: 0,
    complianceScore: 0,
    safetyScore: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Initialize with default values
        let generationData = { today_generation: 0, month_generation: 0 };
        let emissionsData = { scope_breakdown: [] };
        
        try {
          // Fetch generation data
          const generationResponse = await getGenerationSummary();
          generationData = generationResponse.data || generationData;
        } catch (genError) {
        }
        
        try {
          // Fetch emissions data
          const emissionsResponse = await getEmissionsSummary();
          emissionsData = emissionsResponse.data || emissionsData;
        } catch (emError) {
        }
        
        // Calculate total emissions from scope breakdown
        const totalEmissions = emissionsData.scope_breakdown?.reduce(
          (sum: number, scope: any) => sum + (scope.total_co2e || 0), 0
        ) || 0;

        setStats({
          todayGeneration: generationData.today_generation || 0,
          monthGeneration: generationData.month_generation || 0,
          totalEmissions,
          wasteRecycled: 87.3, // Mock data - replace with actual API
          complianceScore: 92,  // Mock data - replace with actual API
          safetyScore: 98       // Mock data - replace with actual API
        });
        
        setError(null);
      } catch (err) {
        // Don't set error for data fetching issues, just use default values
        setStats({
          todayGeneration: 0,
          monthGeneration: 0,
          totalEmissions: 0,
          wasteRecycled: 87.3,
          complianceScore: 92,
          safetyScore: 98
        });
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading ESG Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
      />
    );
  }

  return (
    <PageLayout
      title="ESG Management"
      subtitle="Environmental, Social & Governance dashboard and metrics"
      icon={<EnvironmentOutlined />}
    >
      <div className="esg-dashboard">
      
      {/* Key Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Generation"
              value={stats.todayGeneration}
              precision={1}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              suffix="MWh"
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Month Generation"
              value={stats.monthGeneration}
              precision={1}
              prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
              suffix="MWh"
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="GHG Emissions"
              value={stats.totalEmissions}
              precision={1}
              prefix={<EnvironmentOutlined style={{ color: '#fa8c16' }} />}
              suffix="tCO₂e"
              styles={{ content: { color: '#fa8c16' } }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Waste Recycled"
              value={stats.wasteRecycled}
              precision={1}
              prefix={<DeleteOutlined style={{ color: '#722ed1' }} />}
              suffix="%"
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Performance Indicators Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card 
            title={
              <span>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Environmental Compliance
              </span>
            }
          >
            <Progress 
              percent={stats.complianceScore} 
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              Based on regulatory requirements and audit findings
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card 
            title={
              <span>
                <SafetyOutlined style={{ marginRight: 8 }} />
                Safety Performance
              </span>
            }
          >
            <Progress 
              percent={stats.safetyScore} 
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              Zero incidents target achievement
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="Quick Actions">
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block 
                  onClick={() => navigate('/dashboard/esg/environment?tab=aspects')}
                  icon={<EnvironmentOutlined />}
                >
                  Report Environmental Observation
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block
                  onClick={() => navigate('/dashboard/esg/environment?tab=generation')}
                  icon={<ThunderboltOutlined />}
                >
                  Log Generation Data
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block
                  onClick={() => navigate('/dashboard/esg/environment?tab=waste')}
                  icon={<DeleteOutlined />}
                >
                  Create Waste Manifest
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block
                  type="primary"
                  onClick={() => navigate('/dashboard/esg/reports')}
                  icon={<FileTextOutlined />}
                >
                  Generate ESG Report
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      </div>
    </PageLayout>
  );
};

export default ESGDashboard;