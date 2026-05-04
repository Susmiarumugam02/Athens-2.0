import React, { useState, useCallback, useRef } from 'react';
import {
  Form, Input, Button, DatePicker, message, Card, Tag, Alert,
  Collapse, Row, Col, Select, Divider, Progress, Tooltip,
} from 'antd';
import {
  DownloadOutlined, CloseOutlined, SaveOutlined, SendOutlined,
  CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { inspectionService } from '../../services/inspectionService';
import { useAuthStore } from '../../../../store/authStore';
import PageLayout from '../../../../components/ui/PageLayout';

const { Panel } = Collapse;
const { Option } = Select;

// ─── Checklist definition ────────────────────────────────────────────────────

interface CheckItem {
  key: string;       // check_0 … check_14
  label: string;
  section: 'installation' | 'electrical' | 'termination' | 'earthing';
  isIRTest?: boolean; // triggers auto-validation
  isCritical?: boolean;
}

const CHECK_ITEMS: CheckItem[] = [
  { key: 'check_0',  label: 'Check the IR value of cable before laying',                                                                    section: 'electrical',   isIRTest: true,  isCritical: true  },
  { key: 'check_1',  label: 'Check for physical damage of the cables',                                                                      section: 'installation', isCritical: true  },
  { key: 'check_2',  label: 'Check cable make, size, voltage grade, conductor & insulation type as per design/specifications',              section: 'installation' },
  { key: 'check_3',  label: 'Check Cable route as per drawing',                                                                             section: 'installation' },
  { key: 'check_4',  label: 'Check spacing between cables is as per approved drawing',                                                      section: 'installation' },
  { key: 'check_5',  label: 'No twists, knots or kinks',                                                                                    section: 'installation' },
  { key: 'check_6',  label: 'Check for proper Dressing of the cables',                                                                      section: 'installation' },
  { key: 'check_7',  label: 'Check that cable bending radius is as per IS standards',                                                       section: 'installation' },
  { key: 'check_8',  label: 'Check the Blocks alignment & distance between blocks',                                                         section: 'installation' },
  { key: 'check_9',  label: 'Adequate looping at the termination ends',                                                                     section: 'termination'  },
  { key: 'check_10', label: 'Check for Hume Pipes at road crossing as per drawing',                                                         section: 'installation' },
  { key: 'check_11', label: 'Check the tightness of cable terminations at connection points',                                               section: 'termination',  isCritical: true  },
  { key: 'check_12', label: 'Check for Phase sequence identification',                                                                      section: 'electrical',   isCritical: true  },
  { key: 'check_13', label: 'Check for Earthing Connections provided',                                                                      section: 'earthing',     isCritical: true  },
  { key: 'check_14', label: 'Cable identification tags at termination ends',                                                                 section: 'termination'  },
];

type CheckStatus = 'ok' | 'not_ok' | 'na' | '';

interface CheckState {
  status: CheckStatus;
  remarks: string;
}

type ChecklistState = Record<string, CheckState>;

const DEFAULT_CHECK: CheckState = { status: '', remarks: '' };

function buildDefaultChecklist(): ChecklistState {
  const state: ChecklistState = {};
  CHECK_ITEMS.forEach(item => { state[item.key] = { ...DEFAULT_CHECK }; });
  return state;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcScore(checklist: ChecklistState): number {
  const scoreable = CHECK_ITEMS.filter(i => checklist[i.key].status !== 'na' && checklist[i.key].status !== '');
  if (!scoreable.length) return 0;
  const ok = scoreable.filter(i => checklist[i.key].status === 'ok').length;
  return Math.round((ok / scoreable.length) * 100);
}

function hasFailures(checklist: ChecklistState): boolean {
  return CHECK_ITEMS.some(i => checklist[i.key].status === 'not_ok');
}

function hasCriticalFailure(checklist: ChecklistState): boolean {
  return CHECK_ITEMS.filter(i => i.isCritical).some(i => checklist[i.key].status === 'not_ok');
}

function sectionItems(section: CheckItem['section']): CheckItem[] {
  return CHECK_ITEMS.filter(i => i.section === section);
}

function sectionStatus(section: CheckItem['section'], checklist: ChecklistState): 'ok' | 'fail' | 'partial' | 'empty' {
  const items = sectionItems(section);
  const filled = items.filter(i => checklist[i.key].status !== '');
  if (!filled.length) return 'empty';
  if (filled.some(i => checklist[i.key].status === 'not_ok')) return 'fail';
  if (filled.length < items.length) return 'partial';
  return 'ok';
}

const STATUS_COLORS: Record<string, string> = {
  ok: 'success', fail: 'error', partial: 'warning', empty: 'default',
};
const STATUS_LABELS: Record<string, string> = {
  ok: 'Complete', fail: 'Failed', partial: 'Partial', empty: 'Not Started',
};

// ─── CheckRow component ───────────────────────────────────────────────────────

interface CheckRowProps {
  item: CheckItem;
  state: CheckState;
  onChange: (key: string, field: 'status' | 'remarks', value: string) => void;
}

const CheckRow: React.FC<CheckRowProps> = ({ item, state, onChange }) => {
  const isNotOk = state.status === 'not_ok';
  return (
    <tr className={isNotOk ? 'bg-red-50' : ''}>
      <td className="border border-gray-300 p-2 text-center text-xs text-gray-500 w-10">
        {CHECK_ITEMS.indexOf(item) + 1}
      </td>
      <td className="border border-gray-300 p-2 text-sm">
        <span>{item.label}</span>
        {item.isCritical && (
          <Tag color="orange" className="ml-2 text-xs">Critical</Tag>
        )}
      </td>
      <td className="border border-gray-300 p-1 w-36">
        <Select
          size="small"
          value={state.status || undefined}
          placeholder="Select"
          className="w-full"
          onChange={(val) => onChange(item.key, 'status', val)}
          status={isNotOk ? 'error' : undefined}
        >
          <Option value="ok">
            <CheckCircleOutlined className="text-green-500 mr-1" />OK
          </Option>
          <Option value="not_ok">
            <CloseCircleOutlined className="text-red-500 mr-1" />Not OK
          </Option>
          <Option value="na">
            <MinusCircleOutlined className="text-gray-400 mr-1" />N/A
          </Option>
        </Select>
      </td>
      <td className="border border-gray-300 p-1">
        <Input
          size="small"
          value={state.remarks}
          placeholder="Remarks"
          onChange={(e) => onChange(item.key, 'remarks', e.target.value)}
          status={isNotOk && !state.remarks ? 'warning' : undefined}
        />
      </td>
    </tr>
  );
};

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  section: CheckItem['section'];
  checklist: ChecklistState;
  onChange: (key: string, field: 'status' | 'remarks', value: string) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, section, checklist, onChange }) => {
  const st = sectionStatus(section, checklist);
  const items = sectionItems(section);
  return (
    <Panel
      key={section}
      header={
        <div className="flex items-center justify-between w-full pr-4">
          <span className="font-semibold text-sm">{title}</span>
          <Tag color={STATUS_COLORS[st]}>{STATUS_LABELS[st]}</Tag>
        </div>
      }
    >
      <table className="w-full border border-gray-300 border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 p-2 w-10 text-center">#</th>
            <th className="border border-gray-300 p-2 text-left">Check Parameter</th>
            <th className="border border-gray-300 p-2 w-36 text-center">Status</th>
            <th className="border border-gray-300 p-2 text-left">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <CheckRow
              key={item.key}
              item={item}
              state={checklist[item.key]}
              onChange={onChange}
            />
          ))}
        </tbody>
      </table>
    </Panel>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const HTCableChecklistForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const componentRef = useRef<HTMLDivElement>(null);

  const [checklist, setChecklist] = useState<ChecklistState>(buildDefaultChecklist);
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<'draft' | 'submitted'>('draft');

  const inspectorName = user?.name
    ? `${user.name}${user.surname ? ' ' + user.surname : ''}`
    : user?.email?.split('@')[0] ?? 'Current User';

  // ── checklist change ────────────────────────────────────────────────────────
  const handleCheckChange = useCallback(
    (key: string, field: 'status' | 'remarks', value: string) => {
      setChecklist(prev => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }));
    },
    [],
  );

  // ── serialize checklist for API ─────────────────────────────────────────────
  // Store as "status|remarks" in each check_N field (no migration needed)
  const serializeChecklist = (): Record<string, string> => {
    const out: Record<string, string> = {};
    CHECK_ITEMS.forEach(item => {
      const { status, remarks } = checklist[item.key];
      out[item.key] = `${status}|${remarks}`;
    });
    return out;
  };

  // ── save ────────────────────────────────────────────────────────────────────
  const save = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      try {
        await form.validateFields();
      } catch {
        message.error('Please fill in all required fields.');
        return;
      }
      if (hasCriticalFailure(checklist)) {
        message.error('Resolve critical failed items before submitting.');
        return;
      }
      if (hasFailures(checklist)) {
        message.error('Resolve all failed checklist items before submitting.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const values = form.getFieldsValue();
      const payload = {
        project_name: values.project_name ?? '',
        location_area: values.location_area ?? '',
        date_of_audit: values.date_of_audit
          ? dayjs(values.date_of_audit).format('YYYY-MM-DD')
          : null,
        ...serializeChecklist(),
        // Extra metadata stored in check_14 remarks slot is fine;
        // status and score are handled by the backend viewset
      };

      await inspectionService.createHTCableForm(payload);
      message.success(
        status === 'draft'
          ? 'Draft saved successfully.'
          : 'HT Cable Checklist submitted for review.',
      );

      if (status === 'submitted') {
        navigate('/dashboard/inspection/forms/ht-cable/list');
      }
      // Draft: stay on page
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ??
        err?.response?.data?.error ??
        'Failed to save. Please try again.';
      message.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived state ───────────────────────────────────────────────────────────
  const score = calcScore(checklist);
  const failures = hasFailures(checklist);
  const criticalFail = hasCriticalFailure(checklist);
  const scoreColor = score >= 80 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f';

  return (
    <PageLayout
      title="HT Cable Checklist"
      subtitle="Inverter Room / Control Room Building Final Acceptance Checklist"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'HT Cable Checklist', href: '/dashboard/inspection/forms/ht-cable/list' },
        { title: 'Create' },
      ]}
      actions={[
        <Button
          key="cancel"
          icon={<CloseOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/ht-cable/list')}
        >
          Cancel
        </Button>,
        <Button
          key="draft"
          icon={<SaveOutlined />}
          loading={submitting}
          onClick={() => save('draft')}
        >
          Save as Draft
        </Button>,
        <Tooltip
          key="submit-tip"
          title={criticalFail ? 'Resolve critical failures first' : failures ? 'Resolve all failed items first' : ''}
        >
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            disabled={criticalFail || failures}
            onClick={() => save('submitted')}
          >
            Submit for Review
          </Button>
        </Tooltip>,
        <Button
          key="download"
          icon={<DownloadOutlined />}
          onClick={() => window.print()}
        >
          Download
        </Button>,
      ]}
    >
      <div ref={componentRef} className="space-y-4">

        {/* ── Live score + status banner ── */}
        <div className="flex flex-wrap gap-4 items-center bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium">Checklist Score</span>
            <Progress
              type="circle"
              percent={score}
              size={52}
              strokeColor={scoreColor}
              format={p => <span style={{ fontSize: 11, fontWeight: 600 }}>{p}%</span>}
            />
          </div>

          <Tag
            color={criticalFail ? 'error' : failures ? 'warning' : score > 0 ? 'success' : 'default'}
            style={{ fontSize: 13, padding: '4px 12px' }}
          >
            {criticalFail
              ? '🔴 Critical Failure'
              : failures
              ? '⚠️ Items Need Attention'
              : score > 0
              ? '✅ Looking Good'
              : '— Not Started'}
          </Tag>

          {(criticalFail || failures) && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              message="Submit is blocked until all failed items are resolved."
              style={{ flex: 1 }}
            />
          )}
        </div>

        {/* ── 1. General Information ── */}
        <Card
          title={<span className="font-semibold">1. General Information</span>}
          size="small"
        >
          <Form form={form} layout="vertical">
            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Project Name"
                  name="project_name"
                  rules={[{ required: true, message: 'Project name is required' }]}
                >
                  <Input placeholder="e.g. Solar Plant Phase 2" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Location / Area"
                  name="location_area"
                  rules={[{ required: true, message: 'Location is required' }]}
                >
                  <Input placeholder="e.g. Inverter Room – Block A" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Date of Audit"
                  name="date_of_audit"
                  rules={[{ required: true, message: 'Date is required' }]}
                >
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Inspector">
                  <Input value={inspectorName} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* ── 2–5. Checklist sections ── */}
        <Collapse
          defaultActiveKey={['installation', 'electrical', 'termination', 'earthing']}
          className="bg-white rounded-lg shadow-sm"
        >
          <SectionCard
            title="2. Installation Check"
            section="installation"
            checklist={checklist}
            onChange={handleCheckChange}
          />
          <SectionCard
            title="3. Electrical Testing"
            section="electrical"
            checklist={checklist}
            onChange={handleCheckChange}
          />
          <SectionCard
            title="4. Termination & Jointing"
            section="termination"
            checklist={checklist}
            onChange={handleCheckChange}
          />
          <SectionCard
            title="5. Earthing & Safety"
            section="earthing"
            checklist={checklist}
            onChange={handleCheckChange}
          />
        </Collapse>

        {/* ── Bottom action bar ── */}
        <Divider />
        <div className="flex justify-end gap-3 flex-wrap">
          <Button
            onClick={() => navigate('/dashboard/inspection/forms/ht-cable/list')}
          >
            Cancel
          </Button>
          <Button
            icon={<SaveOutlined />}
            loading={submitting}
            onClick={() => save('draft')}
          >
            Save as Draft
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            disabled={criticalFail || failures}
            onClick={() => save('submitted')}
          >
            Submit for Review
          </Button>
        </div>

      </div>
    </PageLayout>
  );
};

export default HTCableChecklistForm;
