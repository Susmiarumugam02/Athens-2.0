/**
 * ConsideringParametersPanel
 * Intelligent parameter-driven panel with smart field visibility,
 * cascading dependency logic, and auto-fill recommendations.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  AimOutlined,
  BulbOutlined,
  ClearOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  RobotOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ConsideringParameters, ParameterOptions, AutoFillResult } from '../../hooks/useConsideringParameters';

const { Text } = Typography;
const { Option } = Select;

// ─── Department → visible fields mapping ─────────────────────────────────────
const DEPT_VISIBLE_FIELDS: Record<string, Array<keyof ConsideringParameters>> = {
  Electrical: ['department', 'work_area', 'site', 'zone', 'asset', 'inspection_type'],
  Civil:      ['department', 'work_area', 'site', 'zone', 'inspection_type', 'work_type'],
  Quality:    ['department', 'work_area', 'site', 'inspection_type', 'process_type'],
  default:    ['department', 'work_area', 'site', 'inspection_type'],
};

// ─── Work Area → Inspection Type narrowing ───────────────────────────────────
const WORK_AREA_INSPECTION_TYPES: Record<string, string[]> = {
  'Electrical Room':  ['Electrical Inspection', 'Fire Safety Inspection', 'Safety Inspection'],
  'Switchyard':       ['Electrical Inspection', 'Safety Inspection'],
  'Panel Room':       ['Electrical Inspection', 'Safety Inspection'],
  'Substation Area':  ['Electrical Inspection', 'Safety Inspection'],
  'Control Room':     ['Electrical Inspection', 'Safety Inspection', 'Quality Inspection'],
  'Work at Height Platform': ['Safety Inspection', 'Quality Inspection'],
  'Pump Room':        ['Mechanical Inspection', 'Safety Inspection'],
  'Workshop':         ['Mechanical Inspection', 'Safety Inspection', 'Quality Inspection'],
  'Stores Area':      ['Quality Inspection', 'Safety Inspection'],
  'Material Storage Yard': ['Quality Inspection', 'Environmental Inspection', 'Safety Inspection'],
};

// ─── AI recommendation threshold ─────────────────────────────────────────────
function isAIReady(params: ConsideringParameters): boolean {
  const filled = Object.values(params).filter(Boolean).length;
  return filled >= 3 && Boolean(params.department) && Boolean(params.inspection_type);
}

interface ConsideringParametersPanelProps {
  parameters: ConsideringParameters;
  options: Partial<ParameterOptions>;
  autoFillResult: AutoFillResult;
  autoFillLoading: boolean;
  autoFilledFields?: string[];
  onChange: (updates: Partial<ConsideringParameters>) => void;
  onReset: () => void;
  onSaveDefaults: () => void;
  onApplyAutoFill?: () => void;
  /** Base visible params — further filtered by department smart logic */
  visibleParams?: Array<keyof ConsideringParameters>;
  collapsed?: boolean;
  /** Enable smart department-driven field visibility (default: false for backward compat) */
  smartVisibility?: boolean;
}

const PARAM_CONFIG: Record<
  keyof ConsideringParameters,
  { label: string; icon: React.ReactNode; optionKey: keyof ParameterOptions }
> = {
  department: { label: 'Department', icon: <DatabaseOutlined />, optionKey: 'departments' },
  work_area: { label: 'Work Area', icon: <EnvironmentOutlined />, optionKey: 'work_areas' },
  site: { label: 'Site', icon: <AimOutlined />, optionKey: 'sites' },
  zone: { label: 'Zone', icon: <AimOutlined />, optionKey: 'zones' },
  contractor: { label: 'Contractor', icon: <DatabaseOutlined />, optionKey: 'contractors' },
  process_type: { label: 'Process Type', icon: <ThunderboltOutlined />, optionKey: 'process_types' },
  risk_category: { label: 'Risk Category', icon: <BulbOutlined />, optionKey: 'risk_categories' },
  shift: { label: 'Shift', icon: <DatabaseOutlined />, optionKey: 'shifts' },
  asset: { label: 'Asset', icon: <DatabaseOutlined />, optionKey: 'assets' },
  work_type: { label: 'Work Type', icon: <ThunderboltOutlined />, optionKey: 'work_types' },
  inspection_type: { label: 'Inspection Type', icon: <DatabaseOutlined />, optionKey: 'inspection_types' },
  incident_type: { label: 'Incident Type', icon: <BulbOutlined />, optionKey: 'incident_types' },
  user_role: { label: 'User Role', icon: <DatabaseOutlined />, optionKey: 'departments' },
  activity_category: { label: 'Activity Category', icon: <DatabaseOutlined />, optionKey: 'activity_categories' },
  training_type: { label: 'Training Type', icon: <DatabaseOutlined />, optionKey: 'training_types' },
};

const DEFAULT_VISIBLE: Array<keyof ConsideringParameters> = [
  'department',
  'work_area',
  'site',
  'contractor',
  'work_type',
  'risk_category',
];

const RISK_COLORS: Record<string, string> = {
  Low: 'green',
  Medium: 'gold',
  High: 'orange',
  Critical: 'red',
};

const PARAM_COLORS: Record<string, string> = {
  Electrical: '#722ed1',
  Civil: '#1890ff',
  Quality: '#52c41a',
};

const ConsideringParametersPanel: React.FC<ConsideringParametersPanelProps> = ({
  parameters,
  options,
  autoFillResult,
  autoFillLoading,
  autoFilledFields = [],
  onChange,
  onReset,
  onSaveDefaults,
  onApplyAutoFill,
  visibleParams = DEFAULT_VISIBLE,
  collapsed = false,
  smartVisibility = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const activeCount = Object.values(parameters).filter(Boolean).length;
  const autoFillCount = Object.keys(autoFillResult).filter(
    (k) => autoFillResult[k] !== undefined && autoFillResult[k] !== null,
  ).length;
  const aiReady = isAIReady(parameters);
  const deptColor = parameters.department ? (PARAM_COLORS[parameters.department] || '#1677ff') : '#1677ff';

  // Smart field visibility: when smartVisibility=true, derive visible fields from department
  const effectiveVisible = useMemo(() => {
    if (!smartVisibility) return visibleParams;
    const dept = parameters.department;
    const deptFields = dept ? (DEPT_VISIBLE_FIELDS[dept] || DEPT_VISIBLE_FIELDS.default) : DEPT_VISIBLE_FIELDS.default;
    // Always keep department first; intersect with caller's visibleParams if provided
    const base = visibleParams === DEFAULT_VISIBLE ? deptFields : deptFields.filter(f => visibleParams.includes(f) || f === 'department');
    return base;
  }, [smartVisibility, parameters.department, visibleParams]);

  // Smart option narrowing: work_area filters inspection_type options
  const smartOptions = useMemo((): Partial<ParameterOptions> => {
    if (!smartVisibility) return options;
    const narrowed = { ...options };
    const { work_area } = parameters;
    if (work_area && WORK_AREA_INSPECTION_TYPES[work_area]) {
      narrowed.inspection_types = WORK_AREA_INSPECTION_TYPES[work_area];
    }
    return narrowed;
  }, [smartVisibility, options, parameters]);

  const handleChange = useCallback((paramKey: keyof ConsideringParameters, val: string | undefined) => {
    const updates: Partial<ConsideringParameters> = { [paramKey]: val || undefined };
    // Cascade resets
    if (paramKey === 'department') {
      updates.inspection_type = undefined;
      updates.work_area = undefined;
      updates.asset = undefined;
      updates.process_type = undefined;
      updates.zone = undefined;
    }
    if (paramKey === 'work_area') {
      updates.inspection_type = undefined;
    }
    onChange(updates);
  }, [onChange]);

  const renderParamSelect = useCallback(
    (paramKey: keyof ConsideringParameters) => {
      const config = PARAM_CONFIG[paramKey];
      if (!config) return null;
      const opts = (smartOptions[config.optionKey] as string[] | undefined) || [];
      const value = parameters[paramKey];
      const isActive = Boolean(value);
      const accentColor = isActive ? deptColor : undefined;

      return (
        <Col xs={24} sm={12} md={8} lg={6} key={paramKey}
          style={{ transition: 'all 0.25s' }}
        >
          <div style={{ marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 5,
                color: isActive ? accentColor : '#8c8c8c',
                fontWeight: isActive ? 600 : 400,
                transition: 'color 0.2s',
              }}
            >
              <span style={{ color: isActive ? accentColor : '#bfbfbf' }}>{config.icon}</span>
              {config.label}
              {isActive && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 10, marginLeft: 2 }} />}
            </Text>
            <Select
              size="middle"
              allowClear
              showSearch
              placeholder={`Select ${config.label}`}
              value={value || undefined}
              style={{ width: '100%' }}
              onChange={(val) => handleChange(paramKey, val)}
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
              styles={{
                popup: { root: { borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } },
              }}
              variant={isActive ? 'outlined' : 'outlined'}
              style={{
                width: '100%',
                borderRadius: 8,
                ...(isActive ? { borderColor: accentColor } : {}),
              } as React.CSSProperties}
            >
              {opts.map((opt) => (
                <Option key={opt} value={opt}>{opt}</Option>
              ))}
            </Select>
          </div>
        </Col>
      );
    },
    [smartOptions, parameters, handleChange, deptColor],
  );

  const autoFillSummary = () => {
    const items: React.ReactNode[] = [];
    if (autoFillResult.risk_level) {
      items.push(
        <Tag key="risk" color={RISK_COLORS[autoFillResult.risk_level] || 'default'}>
          Risk: {autoFillResult.risk_level}
        </Tag>,
      );
    }
    if (autoFillResult.severity) {
      items.push(
        <Tag key="sev" color={RISK_COLORS[autoFillResult.severity] || 'default'}>
          Severity: {autoFillResult.severity}
        </Tag>,
      );
    }
    if (autoFillResult.inspection_template) {
      items.push(
        <Tag key="tmpl" color="blue">
          Template: {autoFillResult.inspection_template}
        </Tag>,
      );
    }
    if (Array.isArray(autoFillResult.ppe_requirements) && autoFillResult.ppe_requirements.length > 0) {
      items.push(
        <Tag key="ppe" color="purple">
          PPE: {autoFillResult.ppe_requirements.length} items
        </Tag>,
      );
    }
    if (Array.isArray(autoFillResult.checklist) && autoFillResult.checklist.length > 0) {
      items.push(
        <Tag key="chk" color="cyan">
          Checklist: {autoFillResult.checklist.length} items
        </Tag>,
      );
    }
    return items;
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        border: `1px solid ${deptColor}28`,
        background: `linear-gradient(135deg, ${deptColor}08, #f8faff)`,
        borderRadius: 12,
        transition: 'border-color 0.3s, background 0.3s',
      }}
      styles={{ body: { padding: '10px 14px' } }}
    >
      {/* Header */}
      <Row align="middle" justify="space-between" style={{ marginBottom: isCollapsed ? 0 : 10 }}>
        <Col>
          <Space size={6}>
            <RobotOutlined style={{ color: deptColor, fontSize: 15 }} />
            <Text strong style={{ fontSize: 13, color: '#1a1a2e' }}>Considering Parameters</Text>
            {activeCount > 0 && (
              <Badge count={activeCount} style={{ backgroundColor: deptColor }} title={`${activeCount} active`} />
            )}
            {autoFillLoading && (
              <Tag icon={<SyncOutlined spin />} color="processing" style={{ fontSize: 11 }}>Analysing…</Tag>
            )}
            {!autoFillLoading && aiReady && (
              <Tag icon={<ThunderboltOutlined />} color="success" style={{ fontSize: 11, fontWeight: 600 }}>
                AI Recommendation Ready
              </Tag>
            )}
            {!autoFillLoading && !aiReady && autoFillCount > 0 && (
              <Tag icon={<ThunderboltOutlined />} color="blue" style={{ fontSize: 11 }}>
                {autoFillCount} fields ready
              </Tag>
            )}
          </Space>
        </Col>
        <Col>
          <Space size={4}>
            {onApplyAutoFill && autoFillCount > 0 && (
              <Tooltip title="Apply auto-fill to form fields">
                <Button size="small" type="primary" icon={<ThunderboltOutlined />}
                  onClick={onApplyAutoFill} loading={autoFillLoading}
                  style={{ background: deptColor, borderColor: deptColor }}
                >
                  Apply
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Save as defaults">
              <Button size="small" icon={<SaveOutlined />} onClick={onSaveDefaults} />
            </Tooltip>
            <Tooltip title="Clear all">
              <Button size="small" icon={<ClearOutlined />} onClick={onReset} />
            </Tooltip>
            <Button size="small" type="text" style={{ fontSize: 12, color: '#8c8c8c' }}
              onClick={() => setIsCollapsed((c) => !c)}
            >
              {isCollapsed ? '▼ Expand' : '▲ Collapse'}
            </Button>
          </Space>
        </Col>
      </Row>

      {!isCollapsed && (
        <>
          {/* Smart field hint */}
          {smartVisibility && parameters.department && (
            <div style={{
              marginBottom: 8, padding: '4px 10px', borderRadius: 6,
              background: `${deptColor}12`, border: `1px solid ${deptColor}25`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: deptColor, fontSize: 12 }}>
                {PARAM_CONFIG.department.icon}
              </span>
              <Text style={{ fontSize: 11, color: deptColor, fontWeight: 500 }}>
                Showing {effectiveVisible.length} fields relevant to {parameters.department}
              </Text>
            </div>
          )}

          {/* Parameter selectors — auto-fit grid */}
          <Row gutter={[10, 6]}>
            {effectiveVisible.map((key) => renderParamSelect(key))}
          </Row>

          {/* Active chips + auto-fill summary in one compact row */}
          {(activeCount > 0 || autoFillCount > 0) && (
            <div style={{
              marginTop: 8, paddingTop: 8,
              borderTop: '1px solid #f0f0f0',
              display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
            }}>
              {activeCount > 0 && (
                <>
                  <Text type="secondary" style={{ fontSize: 11, marginRight: 2 }}>Active:</Text>
                  {Object.entries(parameters)
                    .filter(([, v]) => Boolean(v))
                    .map(([k, v]) => (
                      <Tag key={k} closable onClose={() => onChange({ [k]: undefined })}
                        color="blue" style={{ marginBottom: 0, fontSize: 11 }}
                      >
                        {PARAM_CONFIG[k as keyof ConsideringParameters]?.label || k}: {v}
                      </Tag>
                    ))}
                </>
              )}
              {autoFillCount > 0 && (
                <>
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: activeCount > 0 ? 8 : 0, marginRight: 2 }}>Suggestions:</Text>
                  {autoFillSummary()}
                </>
              )}
            </div>
          )}

          {autoFilledFields.length > 0 && (
            <Alert type="success" showIcon
              style={{ marginTop: 6, padding: '3px 10px', borderRadius: 6 }}
              message={<Text style={{ fontSize: 11 }}>Auto-filled: {autoFilledFields.join(', ')}</Text>}
            />
          )}
        </>
      )}
    </Card>
  );
};

export default ConsideringParametersPanel;
