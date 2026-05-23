import React, { useState, useCallback, useRef } from 'react';
import {
  Form, Input, Row, Col, Button, DatePicker, message,
  Card, Tag, Alert, Collapse, Select, Divider, Progress, Tooltip, InputNumber,
} from 'antd';
import {
  DownloadOutlined, CloseOutlined, SaveOutlined, SendOutlined,
  CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { inspectionService } from '../../services/inspectionService';
import { useAuthStore } from '../../../../store/authStore';
import PageLayout from '../../../../components/ui/PageLayout';

const { Panel } = Collapse;
const { Option } = Select;

// ─── Checklist definitions ────────────────────────────────────────────────────

interface CheckItem {
  key: string;
  label: string;
  section: 'physical' | 'electrical' | 'ir' | 'earthing' | 'functional' | 'ups_dcdb';
  checkType?: string;       // Visual / Electrical / Mechanical / Measurement
  isIRTest?: boolean;
  isCritical?: boolean;
}

// Page 1 — Physical Inspection (16 items → page1_check_0..15)
const PAGE1_ITEMS: CheckItem[] = [
  { key: 'page1_check_0',  label: 'Check for site physical layout as per drawing.',                                                                    section: 'physical',   isCritical: false },
  { key: 'page1_check_1',  label: 'Ensure that no fouling with civil / structural.',                                                                   section: 'physical' },
  { key: 'page1_check_2',  label: 'Check the foundation readiness and level of foundation.',                                                           section: 'physical' },
  { key: 'page1_check_3',  label: 'Check for erection of Base frames',                                                                                 section: 'physical' },
  { key: 'page1_check_4',  label: 'Check for the tightness of inters panel bolting.',                                                                  section: 'physical' },
  { key: 'page1_check_5',  label: 'Ensure the tightness of Bus bars.',                                                                                 section: 'physical',   isCritical: true },
  { key: 'page1_check_6',  label: 'Check for Phase to Phase & Phase to earth Clearance',                                                               section: 'electrical', isCritical: true },
  { key: 'page1_check_7',  label: 'Check for alignment of Breaker',                                                                                    section: 'physical' },
  { key: 'page1_check_8',  label: 'Check for completion of inters panel wiring as drawing.',                                                           section: 'electrical' },
  { key: 'page1_check_9',  label: 'Check proper earthing as per drawing.',                                                                             section: 'earthing',   isCritical: true },
  { key: 'page1_check_10', label: 'Check that all unused holes are sealed.',                                                                           section: 'physical' },
  { key: 'page1_check_11', label: 'Check completion of all wiring & the cable tags and ferrules are provided as per cable schedule.',                  section: 'electrical' },
  { key: 'page1_check_12', label: 'Check the Busbar tightness',                                                                                        section: 'physical',   isCritical: true },
  { key: 'page1_check_13', label: 'Door alignment',                                                                                                    section: 'physical' },
  { key: 'page1_check_14', label: 'Ensure that the panel is cleaned and closed in all respect.',                                                       section: 'physical' },
  { key: 'page1_check_15', label: 'All above procedure under proper safety surveillance.',                                                             section: 'physical' },
];

// Page 2 — Electrical / Functional checks (12 items → page2_check_0..11)
const PAGE2_ITEMS: CheckItem[] = [
  { key: 'page2_check_0',  label: 'Visual inspection, physical inspection of cubicles',                                                                section: 'physical',   checkType: 'Visual' },
  { key: 'page2_check_1',  label: 'Alignment of Breaker Panel & Trolleys',                                                                             section: 'physical',   checkType: 'Visual / Mechanical' },
  { key: 'page2_check_2',  label: 'Earthing of Equipment',                                                                                             section: 'earthing',   checkType: 'Visual',       isCritical: true },
  { key: 'page2_check_3',  label: 'Control & Power Wiring',                                                                                            section: 'electrical', checkType: 'Electrical' },
  { key: 'page2_check_4',  label: 'Protection / Interlock Schemes',                                                                                    section: 'electrical', checkType: 'Electrical',    isCritical: true },
  { key: 'page2_check_5',  label: 'Manual Operation',                                                                                                  section: 'functional', checkType: 'Mechanical' },
  { key: 'page2_check_6',  label: 'Electrical Operation on Control Voltage',                                                                           section: 'functional', checkType: 'Electrical' },
  { key: 'page2_check_7',  label: 'Insulation Test Min. Value 200 MΩ',                                                                                 section: 'ir',         checkType: 'Measurement',   isIRTest: true, isCritical: true },
  { key: 'page2_check_8',  label: 'CT. Polarity Check',                                                                                                section: 'electrical', checkType: 'Electrical' },
  { key: 'page2_check_9',  label: 'Protection Check, Trial Tripping, Annunciation, Alarms Trials',                                                     section: 'functional', checkType: 'Electrical',    isCritical: true },
  { key: 'page2_check_10', label: 'Switch on No Load',                                                                                                 section: 'functional', checkType: 'Electrical' },
  { key: 'page2_check_11', label: 'Check Functioning of Indicating Meters',                                                                            section: 'functional', checkType: 'Electrical' },
];

const ALL_ITEMS = [...PAGE1_ITEMS, ...PAGE2_ITEMS];

const IR_THRESHOLD = 200; // MΩ — per form spec "Min. Value 200 MΩ"

const IR_TEST_FIELDS = [
  { name: 'test_r_phase_earth', label: "'R' Phase to Earth" },
  { name: 'test_y_phase_earth', label: "'Y' Phase to Earth" },
  { name: 'test_b_phase_earth', label: "'B' Phase to Earth" },
  { name: 'test_r_y_phase',     label: "'R' Phase to 'Y' Phase" },
  { name: 'test_y_b_phase',     label: "'Y' Phase to 'B' Phase" },
  { name: 'test_b_r_phase',     label: "'B' Phase to 'R' Phase" },
  { name: 'test_ryb_n_bus',     label: "R/Y/B Phase to N bus" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = 'ok' | 'not_ok' | 'na' | '';
interface CheckState { status: CheckStatus; remarks: string; }
type ChecklistState = Record<string, CheckState>;

function buildDefault(): ChecklistState {
  const s: ChecklistState = {};
  ALL_ITEMS.forEach(i => { s[i.key] = { status: '', remarks: '' }; });
  return s;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcScore(cl: ChecklistState): number {
  const scoreable = ALL_ITEMS.filter(i => cl[i.key].status === 'ok' || cl[i.key].status === 'not_ok');
  if (!scoreable.length) return 0;
  const ok = scoreable.filter(i => cl[i.key].status === 'ok').length;
  return Math.round((ok / scoreable.length) * 100);
}

function hasAnyFailure(cl: ChecklistState): boolean {
  return ALL_ITEMS.some(i => cl[i.key].status === 'not_ok');
}

function hasCriticalFailure(cl: ChecklistState): boolean {
  return ALL_ITEMS.filter(i => i.isCritical).some(i => cl[i.key].status === 'not_ok');
}

function irFailed(irValues: Record<string, number | null>): boolean {
  return Object.values(irValues).some(v => v !== null && v < IR_THRESHOLD);
}

function sectionHasFailure(
  section: CheckItem['section'],
  cl: ChecklistState,
): boolean {
  return ALL_ITEMS.filter(i => i.section === section).some(i => cl[i.key].status === 'not_ok');
}

function sectionTag(section: CheckItem['section'], cl: ChecklistState) {
  const items = ALL_ITEMS.filter(i => i.section === section);
  const filled = items.filter(i => cl[i.key].status !== '');
  if (!filled.length) return <Tag>Not Started</Tag>;
  if (filled.some(i => cl[i.key].status === 'not_ok')) return <Tag color="error">Failed</Tag>;
  if (filled.length < items.length) return <Tag color="warning">Partial</Tag>;
  return <Tag color="success">Complete</Tag>;
}

// ─── CheckRow ─────────────────────────────────────────────────────────────────

const CheckRow: React.FC<{
  item: CheckItem;
  state: CheckState;
  onChange: (key: string, field: 'status' | 'remarks', val: string) => void;
}> = ({ item, state, onChange }) => {
  const isNotOk = state.status === 'not_ok';
  return (
    <tr className={isNotOk ? 'bg-red-50' : ''}>
      <td className="border border-gray-300 p-2 text-center text-xs text-gray-500 w-10">
        {ALL_ITEMS.indexOf(item) + 1}
      </td>
      <td className="border border-gray-300 p-2 text-sm">
        {item.label}
        {item.isCritical && <Tag color="orange" className="ml-2 text-xs">Critical</Tag>}
        {item.checkType && <Tag className="ml-1 text-xs">{item.checkType}</Tag>}
      </td>
      <td className="border border-gray-300 p-1 w-36">
        <Select
          size="small"
          value={state.status || undefined}
          placeholder="Select"
          className="w-full"
          onChange={val => onChange(item.key, 'status', val)}
          status={isNotOk ? 'error' : undefined}
        >
          <Option value="ok"><CheckCircleOutlined className="text-green-500 mr-1" />OK</Option>
          <Option value="not_ok"><CloseCircleOutlined className="text-red-500 mr-1" />Not OK</Option>
          <Option value="na"><MinusCircleOutlined className="text-gray-400 mr-1" />N/A</Option>
        </Select>
      </td>
      <td className="border border-gray-300 p-1">
        <Input
          size="small"
          value={state.remarks}
          placeholder="Remarks"
          onChange={e => onChange(item.key, 'remarks', e.target.value)}
          status={isNotOk && !state.remarks ? 'warning' : undefined}
        />
      </td>
    </tr>
  );
};

// ─── Section table ────────────────────────────────────────────────────────────

const SectionTable: React.FC<{
  items: CheckItem[];
  cl: ChecklistState;
  onChange: (key: string, field: 'status' | 'remarks', val: string) => void;
}> = ({ items, cl, onChange }) => (
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
        <CheckRow key={item.key} item={item} state={cl[item.key]} onChange={onChange} />
      ))}
    </tbody>
  </table>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ACDBChecklistForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const componentRef = useRef<HTMLDivElement>(null);

  const [cl, setCl] = useState<ChecklistState>(buildDefault);
  const [submitting, setSubmitting] = useState(false);

  // Watch IR values for live validation
  const irValues: Record<string, number | null> = {};
  IR_TEST_FIELDS.forEach(f => {
    irValues[f.name] = Form.useWatch(f.name, form) ?? null;
  });

  const inspectorName = user?.name
    ? `${user.name}${user.surname ? ' ' + user.surname : ''}`
    : user?.email?.split('@')[0] ?? 'Current User';

  const handleCheckChange = useCallback(
    (key: string, field: 'status' | 'remarks', val: string) => {
      setCl(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
    },
    [],
  );

  // Serialize checklist: store "status|remarks" in each page1_check_N / page2_check_N field
  const serializeCl = (): Record<string, string> => {
    const out: Record<string, string> = {};
    ALL_ITEMS.forEach(i => {
      out[i.key] = `${cl[i.key].status}|${cl[i.key].remarks}`;
    });
    return out;
  };

  const save = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      try { await form.validateFields(); } catch {
        message.error('Please fill in all required fields.');
        return;
      }
      if (hasCriticalFailure(cl)) {
        message.error('Resolve critical failed items before submitting.');
        return;
      }
      if (hasAnyFailure(cl)) {
        message.error('Resolve all failed checklist items before submitting.');
        return;
      }
      if (irFailed(irValues)) {
        message.error('IR test values are below threshold (200 MΩ). Resolve before submitting.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const values = form.getFieldsValue();
      const payload = {
        client: values.client ?? '',
        location: values.location ?? '',
        date_of_inspection: values.date_of_inspection
          ? dayjs(values.date_of_inspection).format('YYYY-MM-DD')
          : null,
        equipment_description: values.equipment_description ?? '',
        equipment_serial_no: values.equipment_serial_no ?? '',
        equipment_rating: values.equipment_rating ?? '',
        ref_drawing_no: values.ref_drawing_no ?? '',
        // IR test values
        test_r_phase_earth: values.test_r_phase_earth ?? null,
        test_y_phase_earth: values.test_y_phase_earth ?? null,
        test_b_phase_earth: values.test_b_phase_earth ?? null,
        test_r_y_phase: values.test_r_y_phase ?? null,
        test_y_b_phase: values.test_y_b_phase ?? null,
        test_b_r_phase: values.test_b_r_phase ?? null,
        test_ryb_n_bus: values.test_ryb_n_bus ?? null,
        // Checklist items
        ...serializeCl(),
      };

      await inspectionService.createACDBChecklistForm(payload);
      message.success(
        status === 'draft' ? 'Draft saved successfully.' : 'ACDB Checklist submitted for review.',
      );
      if (status === 'submitted') {
        navigate('/dashboard/inspection/forms/acdb-checklist/list');
      }
    } catch (err: any) {
      message.error(
        err?.response?.data?.detail ?? err?.response?.data?.error ?? 'Failed to save. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const score = calcScore(cl);
  const failures = hasAnyFailure(cl);
  const criticalFail = hasCriticalFailure(cl);
  const irFail = irFailed(irValues);
  const blocked = criticalFail || failures || irFail;
  const scoreColor = score >= 80 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f';

  return (
    <PageLayout
      title="ACDB Checklist"
      subtitle="Pre-Commissioning Checklist – LT Swgr / ACDB / DCDB / UPS panel"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'ACDB Checklist', href: '/dashboard/inspection/forms/acdb-checklist/list' },
        { title: 'Create' },
      ]}
      actions={[
        <Button key="cancel" icon={<CloseOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/acdb-checklist/list')}>
          Cancel
        </Button>,
        <Button key="draft" icon={<SaveOutlined />} loading={submitting} onClick={() => save('draft')}>
          Save as Draft
        </Button>,
        <Tooltip key="submit-tip" title={blocked ? 'Resolve all failures before submitting' : ''}>
          <Button type="primary" icon={<SendOutlined />} loading={submitting}
            disabled={blocked} onClick={() => save('submitted')}>
            Submit for Review
          </Button>
        </Tooltip>,
        <Button key="download" icon={<DownloadOutlined />} onClick={() => window.print()}>
          Download
        </Button>,
      ]}
    >
      <div ref={componentRef} className="space-y-4">

        {/* ── Score / status banner ── */}
        <div className="flex flex-wrap gap-4 items-center bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium">Score</span>
            <Progress type="circle" percent={score} size={52} strokeColor={scoreColor}
              format={p => <span style={{ fontSize: 11, fontWeight: 600 }}>{p}%</span>} />
          </div>
          <Tag color={criticalFail ? 'error' : failures || irFail ? 'warning' : score > 0 ? 'success' : 'default'}
            style={{ fontSize: 13, padding: '4px 12px' }}>
            {criticalFail ? '🔴 Critical Failure'
              : failures ? '⚠️ Items Need Attention'
              : irFail ? '⚠️ IR Test Below Threshold'
              : score > 0 ? '✅ Looking Good' : '— Not Started'}
          </Tag>
          {blocked && (
            <Alert type="error" showIcon icon={<WarningOutlined />}
              message="Submit is blocked until all failures are resolved."
              style={{ flex: 1 }} />
          )}
        </div>

        {/* ── 1. General Information ── */}
        <Card title={<span className="font-semibold">1. General Information</span>} size="small">
          <Form form={form} layout="vertical">
            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item label="Client" name="client"
                  rules={[{ required: true, message: 'Client is required' }]}>
                  <Input placeholder="Client name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Location" name="location"
                  rules={[{ required: true, message: 'Location is required' }]}>
                  <Input placeholder="e.g. Switchroom – Block A" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Date of Inspection" name="date_of_inspection"
                  rules={[{ required: true, message: 'Date is required' }]}>
                  <DatePicker className="w-full" defaultValue={dayjs()} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Equipment Description" name="equipment_description">
                  <Input placeholder="e.g. ACDB Panel" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Equipment Serial No." name="equipment_serial_no">
                  <Input placeholder="Serial number" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Equipment Rating" name="equipment_rating">
                  <Input placeholder="e.g. 415V, 100A" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Ref. Drawing No." name="ref_drawing_no">
                  <Input placeholder="Drawing reference" />
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

        {/* ── 2–6. Checklist sections ── */}
        <Collapse
          defaultActiveKey={['physical', 'electrical', 'ir', 'earthing', 'functional']}
          className="bg-white rounded-lg shadow-sm"
        >
          {/* Physical Inspection */}
          <Panel key="physical"
            header={
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold text-sm">2. Physical Inspection</span>
                {sectionTag('physical', cl)}
              </div>
            }
          >
            <SectionTable
              items={PAGE1_ITEMS.filter(i => i.section === 'physical')}
              cl={cl} onChange={handleCheckChange}
            />
          </Panel>

          {/* Electrical Checks */}
          <Panel key="electrical"
            header={
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold text-sm">3. Electrical Checks</span>
                {sectionTag('electrical', cl)}
              </div>
            }
          >
            <SectionTable
              items={[...PAGE1_ITEMS.filter(i => i.section === 'electrical'),
                      ...PAGE2_ITEMS.filter(i => i.section === 'electrical')]}
              cl={cl} onChange={handleCheckChange}
            />
          </Panel>

          {/* IR Test */}
          <Panel key="ir"
            header={
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold text-sm">4. Insulation Resistance (IR) Test</span>
                {irFail
                  ? <Tag color="error">⚠️ Below Threshold</Tag>
                  : Object.values(irValues).some(v => v !== null)
                  ? <Tag color="success">Values Entered</Tag>
                  : <Tag>Not Started</Tag>}
              </div>
            }
          >
            {irFail && (
              <Alert type="error" showIcon className="mb-4"
                message={`One or more IR values are below the minimum threshold of ${IR_THRESHOLD} MΩ.`} />
            )}
            <Form form={form} layout="vertical">
              <Row gutter={24}>
                {IR_TEST_FIELDS.map(f => (
                  <Col xs={24} md={8} key={f.name}>
                    <Form.Item label={f.label} name={f.name}>
                      <InputNumber
                        className="w-full"
                        placeholder="MΩ"
                        min={0}
                        step={0.1}
                        precision={2}
                        addonAfter="MΩ"
                        status={
                          irValues[f.name] !== null && irValues[f.name]! < IR_THRESHOLD
                            ? 'error'
                            : undefined
                        }
                      />
                    </Form.Item>
                    {irValues[f.name] !== null && irValues[f.name]! < IR_THRESHOLD && (
                      <p className="text-red-500 text-xs -mt-3 mb-2">
                        Below {IR_THRESHOLD} MΩ — FAIL
                      </p>
                    )}
                  </Col>
                ))}
              </Row>
              <p className="text-xs text-gray-500 mt-2">
                NOTE: During IR Test isolate neutral link, remove voltmeter, space heater fuses if any.
                Calibration test certificate will be submitted at the time of testing.
              </p>
            </Form>
            {/* IR checklist item */}
            <div className="mt-4">
              <SectionTable
                items={PAGE2_ITEMS.filter(i => i.section === 'ir')}
                cl={cl} onChange={handleCheckChange}
              />
            </div>
          </Panel>

          {/* Earthing */}
          <Panel key="earthing"
            header={
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold text-sm">5. Earthing & Safety</span>
                {sectionTag('earthing', cl)}
              </div>
            }
          >
            <SectionTable
              items={[...PAGE1_ITEMS.filter(i => i.section === 'earthing'),
                      ...PAGE2_ITEMS.filter(i => i.section === 'earthing')]}
              cl={cl} onChange={handleCheckChange}
            />
          </Panel>

          {/* Functional Checks */}
          <Panel key="functional"
            header={
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold text-sm">6. Functional Checks</span>
                {sectionTag('functional', cl)}
              </div>
            }
          >
            <SectionTable
              items={PAGE2_ITEMS.filter(i => i.section === 'functional')}
              cl={cl} onChange={handleCheckChange}
            />
          </Panel>
        </Collapse>

        {/* ── Bottom action bar ── */}
        <Divider />
        <div className="flex justify-end gap-3 flex-wrap">
          <Button onClick={() => navigate('/dashboard/inspection/forms/acdb-checklist/list')}>
            Cancel
          </Button>
          <Button icon={<SaveOutlined />} loading={submitting} onClick={() => save('draft')}>
            Save as Draft
          </Button>
          <Button type="primary" icon={<SendOutlined />} loading={submitting}
            disabled={blocked} onClick={() => save('submitted')}>
            Submit for Review
          </Button>
        </div>

      </div>
    </PageLayout>
  );
};

export default ACDBChecklistForm;
