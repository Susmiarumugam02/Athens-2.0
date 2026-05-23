import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Button, Divider, Select } from 'antd';
import { 
  ExperimentOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  BuildOutlined,
  AuditOutlined,
  SearchOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
  WarningOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import PageLayout from '../../../components/ui/PageLayout';
import { inspectionService } from '../services/inspectionService';
import { useAuthStore } from '../../../store/authStore';

const { Option } = Select;

const CATEGORY_FORMS: Record<string, { label: string; icon: React.ReactNode; forms: { value: string; label: string; checklist: number; risk: string; department: string; lastDate: string }[] }> = {
  electrical: {
    label: 'Electrical',
    icon: <ThunderboltOutlined />,
    forms: [
      { value: 'electrical_panel', label: 'Electrical Panel Inspection', checklist: 24, risk: 'High', department: 'Electrical', lastDate: '2025-07-10' },
      { value: 'earthing', label: 'Earthing Inspection', checklist: 18, risk: 'High', department: 'Electrical', lastDate: '2025-07-08' },
      { value: 'cable_routing', label: 'Cable Routing Inspection', checklist: 15, risk: 'Medium', department: 'Electrical', lastDate: '2025-07-05' },
      { value: 'transformer', label: 'Transformer Inspection', checklist: 22, risk: 'Critical', department: 'Electrical', lastDate: '2025-07-01' },
      { value: 'ht_lt', label: 'HT/LT Checklist', checklist: 30, risk: 'Critical', department: 'Electrical', lastDate: '2025-06-28' },
    ],
  },
  civil: {
    label: 'Civil',
    icon: <BuildOutlined />,
    forms: [
      { value: 'concrete', label: 'Concrete Inspection', checklist: 20, risk: 'Medium', department: 'Civil', lastDate: '2025-07-11' },
      { value: 'structural', label: 'Structural Inspection', checklist: 28, risk: 'High', department: 'Civil', lastDate: '2025-07-09' },
      { value: 'excavation', label: 'Excavation Checklist', checklist: 16, risk: 'High', department: 'Civil', lastDate: '2025-07-07' },
      { value: 'scaffolding', label: 'Scaffolding Inspection', checklist: 19, risk: 'High', department: 'Civil', lastDate: '2025-07-04' },
      { value: 'reinforcement', label: 'Reinforcement Inspection', checklist: 14, risk: 'Medium', department: 'Civil', lastDate: '2025-07-02' },
    ],
  },
  quality: {
    label: 'Quality',
    icon: <AuditOutlined />,
    forms: [
      { value: 'qa_qc', label: 'QA/QC Inspection', checklist: 35, risk: 'Medium', department: 'Quality', lastDate: '2025-07-12' },
      { value: 'welding', label: 'Welding Inspection', checklist: 22, risk: 'High', department: 'Quality', lastDate: '2025-07-10' },
      { value: 'material', label: 'Material Verification', checklist: 18, risk: 'Low', department: 'Quality', lastDate: '2025-07-08' },
      { value: 'ncr', label: 'NCR Inspection', checklist: 12, risk: 'High', department: 'Quality', lastDate: '2025-07-06' },
      { value: 'dimensional', label: 'Dimensional Check', checklist: 10, risk: 'Medium', department: 'Quality', lastDate: '2025-07-03' },
    ],
  },
};

const RISK_COLORS: Record<string, string> = {
  Low: '#52c41a',
  Medium: '#faad14',
  High: '#ff7a00',
  Critical: '#ff4d4f',
};

const FORM_ROUTES: Record<string, string> = {
  // Electrical
  electrical_panel: '/app/inspection/forms/ac-cable-testing/create',
  earthing:         '/app/inspection/forms/earthing-checklist/create',
  cable_routing:    '/app/inspection/forms/ht-cable/create',
  transformer:      '/app/inspection/forms/ht-precommission/create',
  ht_lt:            '/app/inspection/forms/acdb-checklist/create',
  // Civil
  concrete:         '/app/inspection/forms/concrete-pour-card/create',
  structural:       '/app/inspection/forms/civil-work-checklist/create',
  excavation:       '/app/inspection/forms/pcc-checklist/create',
  scaffolding:      '/app/inspection/forms/bar-bending-schedule/create',
  reinforcement:    '/app/inspection/forms/cement-register/create',
  // Quality
  qa_qc:            '/app/inspection/forms/control-room-audit-checklist/create',
  welding:          '/app/inspection/forms/battery-charger-checklist/create',
  material:         '/app/inspection/forms/battery-ups-checklist/create',
  ncr:              '/app/inspection/forms/bus-duct-checklist/create',
  dimensional:      '/app/inspection/forms/control-cable-checklist/create',
};

const CATEGORY_COLORS: Record<string, string> = {
  electrical: '#722ed1',
  civil: '#1890ff',
  quality: '#52c41a',
};

const InspectionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [formSearch, setFormSearch] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalInspections: 156,
      completedInspections: 142,
      pendingInspections: 14,
      complianceRate: 94.2,
      avgScore: 87.5,
      criticalFindings: 3
    },
    trends: {
      inspectionTrend: [
        { name: 'Mon', completed: 12, pending: 3, score: 89 },
        { name: 'Tue', completed: 15, pending: 2, score: 92 },
        { name: 'Wed', completed: 18, pending: 4, score: 87 },
        { name: 'Thu', completed: 14, pending: 1, score: 95 },
        { name: 'Fri', completed: 20, pending: 2, score: 91 },
        { name: 'Sat', completed: 8, pending: 1, score: 88 },
        { name: 'Sun', completed: 10, pending: 1, score: 90 }
      ],
      typeDistribution: [
        { name: 'Quality', value: 32, color: '#52c41a' },
        { name: 'Civil', value: 38, color: '#1890ff' },
        { name: 'Electrical', value: 18, color: '#722ed1' },
      ],
      complianceByType: [
        { type: 'Quality', compliant: 95, nonCompliant: 5 },
        { type: 'Civil', compliant: 91, nonCompliant: 9 },
        { type: 'Electrical', compliant: 94, nonCompliant: 6 },
      ]
    }
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // const response = await inspectionService.getDashboardStats({ project: selectedProject });
      // setDashboardData(response.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [selectedProject]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (formRef.current && !formRef.current.contains(e.target as Node)) setFormOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCategorySelect = (key: string) => {
    setSelectedCategory(key);
    setSelectedForm(null);
    setFormSearch('');
    setCatOpen(false);
  };

  const handleFormSelect = (val: string) => {
    setSelectedForm(val);
    setFormOpen(false);
    setFormSearch('');
  };

  const activeCat = selectedCategory ? CATEGORY_FORMS[selectedCategory] : null;
  const filteredForms = activeCat
    ? activeCat.forms.filter(f => f.label.toLowerCase().includes(formSearch.toLowerCase()))
    : [];
  const activeFormData = activeCat && selectedForm
    ? activeCat.forms.find(f => f.value === selectedForm)
    : null;

  const CascadingSelector = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* Category Dropdown */}
      <div ref={catRef} style={{ position: 'relative', minWidth: 200 }}>
        <button
          onClick={() => setCatOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10, border: '1.5px solid',
            borderColor: selectedCategory ? CATEGORY_COLORS[selectedCategory] : '#d9d9d9',
            background: selectedCategory ? `${CATEGORY_COLORS[selectedCategory]}12` : '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 500, width: '100%',
            transition: 'all 0.2s', outline: 'none', color: '#1a1a2e',
            boxShadow: catOpen ? '0 0 0 3px rgba(24,144,255,0.12)' : 'none',
          }}
        >
          <span style={{ color: selectedCategory ? CATEGORY_COLORS[selectedCategory] : '#8c8c8c', fontSize: 15 }}>
            {selectedCategory ? CATEGORY_FORMS[selectedCategory].icon : <AuditOutlined />}
          </span>
          <span style={{ flex: 1, textAlign: 'left', color: selectedCategory ? '#1a1a2e' : '#8c8c8c' }}>
            {selectedCategory ? CATEGORY_FORMS[selectedCategory].label : 'Inspection Category'}
          </span>
          <span style={{ color: '#8c8c8c', fontSize: 10, transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
        </button>
        {catOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1000,
            background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            border: '1px solid #f0f0f0', overflow: 'hidden', minWidth: 200,
          }}>
            {Object.entries(CATEGORY_FORMS).map(([key, cat]) => (
              <div
                key={key}
                onClick={() => handleCategorySelect(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                  background: selectedCategory === key ? `${CATEGORY_COLORS[key]}15` : 'transparent',
                  borderLeft: selectedCategory === key ? `3px solid ${CATEGORY_COLORS[key]}` : '3px solid transparent',
                  transition: 'background 0.15s',
                  color: '#1a1a2e',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${CATEGORY_COLORS[key]}10`)}
                onMouseLeave={e => (e.currentTarget.style.background = selectedCategory === key ? `${CATEGORY_COLORS[key]}15` : 'transparent')}
              >
                <span style={{ color: CATEGORY_COLORS[key], fontSize: 15 }}>{cat.icon}</span>
                <span style={{ fontWeight: selectedCategory === key ? 600 : 400 }}>{cat.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8c8c8c', background: '#f5f5f5', borderRadius: 10, padding: '1px 7px' }}>
                  {cat.forms.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Dropdown */}
      <div ref={formRef} style={{ position: 'relative', minWidth: 240 }}>
        <button
          onClick={() => { if (activeCat) setFormOpen(o => !o); }}
          disabled={!activeCat}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10, border: '1.5px solid',
            borderColor: activeFormData ? CATEGORY_COLORS[selectedCategory!] : '#d9d9d9',
            background: activeFormData ? `${CATEGORY_COLORS[selectedCategory!]}12` : '#fff',
            cursor: activeCat ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500, width: '100%',
            transition: 'all 0.2s', outline: 'none', color: '#1a1a2e', opacity: activeCat ? 1 : 0.5,
            boxShadow: formOpen ? '0 0 0 3px rgba(24,144,255,0.12)' : 'none',
          }}
        >
          <span style={{ color: activeFormData ? CATEGORY_COLORS[selectedCategory!] : '#8c8c8c', fontSize: 15 }}>
            <FileTextOutlined />
          </span>
          <span style={{ flex: 1, textAlign: 'left', color: activeFormData ? '#1a1a2e' : '#8c8c8c' }}>
            {activeFormData ? activeFormData.label : (activeCat ? 'Select Inspection Form' : 'Select Category First')}
          </span>
          <span style={{ color: '#8c8c8c', fontSize: 10, transform: formOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
        </button>
        {formOpen && activeCat && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1000,
            background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            border: '1px solid #f0f0f0', overflow: 'hidden', minWidth: 260,
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f5f5', borderRadius: 8, padding: '6px 10px' }}>
                <SearchOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
                <input
                  autoFocus
                  value={formSearch}
                  onChange={e => setFormSearch(e.target.value)}
                  placeholder="Search forms..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: '#1a1a2e' }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {filteredForms.length === 0 ? (
                <div style={{ padding: '14px', textAlign: 'center', color: '#8c8c8c', fontSize: 13 }}>No forms found</div>
              ) : filteredForms.map(f => (
                <div
                  key={f.value}
                  onClick={() => handleFormSelect(f.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                    background: selectedForm === f.value ? `${CATEGORY_COLORS[selectedCategory!]}15` : 'transparent',
                    borderLeft: selectedForm === f.value ? `3px solid ${CATEGORY_COLORS[selectedCategory!]}` : '3px solid transparent',
                    transition: 'background 0.15s', color: '#1a1a2e',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${CATEGORY_COLORS[selectedCategory!]}10`)}
                  onMouseLeave={e => (e.currentTarget.style.background = selectedForm === f.value ? `${CATEGORY_COLORS[selectedCategory!]}15` : 'transparent')}
                >
                  <FileTextOutlined style={{ color: CATEGORY_COLORS[selectedCategory!], fontSize: 14 }} />
                  <span style={{ flex: 1, fontWeight: selectedForm === f.value ? 600 : 400 }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: RISK_COLORS[f.risk], background: `${RISK_COLORS[f.risk]}18`, borderRadius: 8, padding: '1px 7px', fontWeight: 600 }}>
                    {f.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Inspection Dashboard"
      subtitle="Monitor inspection activities, compliance rates, and performance metrics"
      icon={<ExperimentOutlined />}
      actions={CascadingSelector}
    >
      {/* Form Info Preview */}
      {activeFormData && (
        <div style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 12,
          background: `linear-gradient(135deg, ${CATEGORY_COLORS[selectedCategory!]}10, ${CATEGORY_COLORS[selectedCategory!]}05)`,
          border: `1.5px solid ${CATEGORY_COLORS[selectedCategory!]}30`,
          display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, color: CATEGORY_COLORS[selectedCategory!] }}>
              {CATEGORY_FORMS[selectedCategory!].icon}
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{activeFormData.label}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>{activeFormData.department} Department</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span style={{ fontSize: 13, color: '#595959' }}><b>{activeFormData.checklist}</b> checklist items</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <WarningOutlined style={{ color: RISK_COLORS[activeFormData.risk] }} />
              <span style={{ fontSize: 13 }}>
                Risk: <b style={{ color: RISK_COLORS[activeFormData.risk] }}>{activeFormData.risk}</b>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontSize: 13, color: '#595959' }}>Last: <b>{activeFormData.lastDate}</b></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamOutlined style={{ color: '#722ed1' }} />
              <span style={{ fontSize: 13, color: '#595959' }}>{activeFormData.department}</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Total Inspections"
              value={dashboardData.kpis.totalInspections}
              prefix={<ExperimentOutlined />}
              suffix={
                <Tag color="blue">↑ 8.5%</Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Completed"
              value={dashboardData.kpis.completedInspections}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#3f8600' } }}
              suffix={
                <Tag color="green">↑ 12.3%</Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Compliance Rate"
              value={dashboardData.kpis.complianceRate}
              precision={1}
              suffix="%"
              prefix={<BarChartOutlined />}
              styles={{ content: { color: dashboardData.kpis.complianceRate >= 90 ? '#3f8600' : '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="Critical Findings"
              value={dashboardData.kpis.criticalFindings}
              prefix={<ExclamationCircleOutlined />}
              styles={{ content: { color: dashboardData.kpis.criticalFindings > 5 ? '#cf1322' : '#3f8600' } }}
              suffix={
                <Tag color={dashboardData.kpis.criticalFindings > 5 ? "red" : "green"}>
                  {dashboardData.kpis.criticalFindings > 5 ? "High" : "Low"}
                </Tag>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* ── Available Inspection Forms ── */}
      {selectedCategory && activeCat && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            paddingBottom: 12, borderBottom: `2px solid ${CATEGORY_COLORS[selectedCategory]}30`,
          }}>
            <span style={{ fontSize: 18, color: CATEGORY_COLORS[selectedCategory] }}>
              {activeCat.icon}
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
                Available Inspection Forms
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {activeCat.label} · {activeCat.forms.length} forms available
              </div>
            </div>
          </div>

          <Row gutter={[16, 16]}>
            {activeCat.forms.map(f => (
              <Col xs={24} sm={12} lg={8} xl={6} key={f.value}>
                <div
                  style={{
                    border: `1.5px solid ${selectedForm === f.value ? CATEGORY_COLORS[selectedCategory] : '#f0f0f0'}`,
                    borderRadius: 12,
                    padding: '16px 18px',
                    background: selectedForm === f.value
                      ? `linear-gradient(135deg, ${CATEGORY_COLORS[selectedCategory]}10, ${CATEGORY_COLORS[selectedCategory]}05)`
                      : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedForm === f.value
                      ? `0 4px 16px ${CATEGORY_COLORS[selectedCategory]}20`
                      : '0 1px 4px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                  onMouseEnter={e => {
                    if (selectedForm !== f.value)
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={e => {
                    if (selectedForm !== f.value)
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  }}
                >
                  {/* Icon + Title */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: `${CATEGORY_COLORS[selectedCategory]}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: CATEGORY_COLORS[selectedCategory], fontSize: 16,
                    }}>
                      <FileTextOutlined />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: '#1a1a2e',
                        lineHeight: 1.4, wordBreak: 'break-word',
                      }}>
                        {f.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                        {f.department} Department
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 6,
                      background: '#f5f5f5', color: '#595959',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 10 }} />
                      {f.checklist} items
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 6,
                      background: `${RISK_COLORS[f.risk]}15`,
                      color: RISK_COLORS[f.risk], fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <WarningOutlined style={{ fontSize: 10 }} />
                      {f.risk}
                    </span>
                  </div>

                  {/* Last date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#8c8c8c' }}>
                    <CalendarOutlined style={{ fontSize: 11 }} />
                    Last: {f.lastDate}
                  </div>

                  {/* Open Form button */}
                  <Button
                    type={selectedForm === f.value ? 'primary' : 'default'}
                    size="small"
                    icon={<RightOutlined />}
                    style={{
                      marginTop: 4,
                      background: selectedForm === f.value ? CATEGORY_COLORS[selectedCategory] : undefined,
                      borderColor: selectedForm === f.value ? CATEGORY_COLORS[selectedCategory] : undefined,
                      borderRadius: 8,
                    }}
                    onClick={() => handleFormSelect(f.value)}
                  >
                    {selectedForm === f.value ? 'Form Loaded' : 'Open Form'}
                  </Button>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Charts Row */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={16}>
          <Card title="Inspection Trends" className="h-full">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.trends.inspectionTrend}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#52c41a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#faad14" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#faad14" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="1"
                    stroke="#52c41a" 
                    fillOpacity={1} 
                    fill="url(#colorCompleted)" 
                    name="Completed"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pending" 
                    stackId="1"
                    stroke="#faad14" 
                    fillOpacity={1} 
                    fill="url(#colorPending)" 
                    name="Pending"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Inspection Types" className="h-full">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.trends.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dashboardData.trends.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {dashboardData.trends.typeDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Compliance Analysis */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Compliance Rate by Type">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.trends.complianceByType}>
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="compliant" fill="#52c41a" name="Compliant" />
                  <Bar dataKey="nonCompliant" fill="#ff4d4f" name="Non-Compliant" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Performance Metrics" className="h-full">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span>Average Score</span>
                  <span className="font-medium">{dashboardData.kpis.avgScore}%</span>
                </div>
                <Progress 
                  percent={dashboardData.kpis.avgScore} 
                  strokeColor={{
                    '0%': '#ff4d4f',
                    '50%': '#faad14',
                    '100%': '#52c41a',
                  }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span>Completion Rate</span>
                  <span className="font-medium">91.0%</span>
                </div>
                <Progress percent={91} status="active" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span>On-Time Completion</span>
                  <span className="font-medium">88.5%</span>
                </div>
                <Progress percent={88.5} strokeColor="#1890ff" />
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">94.2%</div>
                  <div className="text-sm text-gray-600">Overall Compliance</div>
                  <Tag color="green" className="mt-2">Excellent</Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </PageLayout>
  );
};

export default InspectionDashboard;
