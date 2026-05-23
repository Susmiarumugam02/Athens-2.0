import React, { useState, useCallback } from 'react';
import {
  Form, Input, Button, DatePicker, Select, Card, Tag, Alert,
  Collapse, Row, Col, Divider, Progress, Tooltip, message,
} from 'antd';
import {
  CloseOutlined, SaveOutlined, SendOutlined, PlusOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { inspectionService } from '../../services/inspectionService';
import { useAuthStore } from '../../../../store/authStore';
import PageLayout from '../../../../components/ui/PageLayout';
import {
  GENERAL_FIELDS,
  CHECKLIST_SECTIONS,
  ELECTRICAL_TESTS,
  APPROVAL_ROLES,
  type ChecklistStatus,
  type TestResult,
} from './htPreCommissionConfig';

const { Panel } = Collapse;
const { Option } = Select;
const { TextArea } = Input;

// ─── Local types ──────────────────────────────────────────────────────────────

interface CheckState { status: ChecklistStatus; remarks: string; }
type AllChecklists = Record<string, Record<string, CheckState>>;

interface TestState { observed_value: string; result: TestResult; remarks: string; }
type AllTests = Record<string, TestState>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChecklists(): AllChecklists {
  const out: AllChecklists = {};
  CHECKLIST_SECTIONS.forEach(sec => {
    out[sec.id] = {};
    sec.items.forEach(item => { out[sec.id][item.id] = { status: '', remarks: '' }; });
  });
  return out;
}

function buildTests(): AllTests {
  const out: AllTests = {};
  ELECTRICAL_TESTS.forEach(t => { out[t.id] = { observed_value: '', result: '', remarks: '' }; });
  return out;
}

function calcScore(cl: AllChecklists): number {
  let ok = 0, total = 0;
  CHECKLIST_SECTIONS.forEach(sec =>
    sec.items.forEach(item => {
      const s = cl[sec.id]?.[item.id]?.status;
      if (s === 'ok' || s === 'not_ok') { total++; if (s === 'ok') ok++; }
    })
  );
  return total === 0 ? 0 : Math.round((ok / total) * 100);
}

function hasCriticalFail(cl: AllChecklists, tests: AllTests): boolean {
  for (const sec of CHECKLIST_SECTIONS)
    for (const item of sec.items)
      if (item.isCritical && cl[sec.id]?.[item.id]?.status === 'not_ok') return true;
  for (const t of ELECTRICAL_TESTS)
    if (t.isCritical && tests[t.id]?.result === 'FAIL') return true;
  return false;
}

function hasAnyFail(cl: AllChecklists, tests: AllTests): boolean {
  for (const sec of CHECKLIST_SECTIONS)
    for (const item of sec.items)
      if (cl[sec.id]?.[item.id]?.status === 'not_ok') return true;
  for (const t of ELECTRICAL_TESTS)
    if (tests[t.id]?.result === 'FAIL') return true;
  return false;
}

function sectionDone(secId: string, cl: AllChecklists): boolean {
  const sec = CHECKLIST_SECTIONS.find(s => s.id === secId);
  return !!sec && sec.items.every(i => cl[secId]?.[i.id]?.status !== '');
}

function sectionFailed(secId: string, cl: AllChecklists): boolean {
  const sec = CHECKLIST_SECTIONS.find(s => s.id === secId);
  return !!sec && sec.items.some(i => cl[secId]?.[i.id]?.status === 'not_ok');
}

// ─── ChecklistRow ─────────────────────────────────────────────────────────────

const ChecklistRow: React.FC<{
  idx: number;
  label: string;
  isCritical?: boolean;
  state: CheckState;
  onChange: (field: 'status' | 'remarks', val: string) => void;
}> = ({ idx, label, isCritical, state, onChange }) => (
  <tr style={{ background: state.status === 'not_ok' ? 'var(--color-error-bg, #fff1f0)' : undefined }}>
    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-xs text-gray-500 w-8">{idx}</td>
    <td className="border border-gray-300 dark:border-gray-600 p-2 text-sm">
      {label}
      {isCritical && <Tag color="orange" className="ml-2 text-xs">Critical</Tag>}
    </td>
    <td className="border border-gray-300 dark:border-gray-600 p-1 w-36">
      <Select
        size="small" className="w-full"
        value={state.status || undefined}
        placeholder="Select"
        onChange={val => onChange('status', val)}
        status={state.status === 'not_ok' ? 'error' : undefined}
      >
        <Option value="ok">
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />OK
        </Option>
        <Option value="not_ok">
          <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />NOT OK
        </Option>
        <Option value="na">
          <MinusCircleOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />N/A
        </Option>
      </Select>
    </td>
    <td className="border border-gray-300 dark:border-gray-600 p-1">
      <Input
        size="small" value={state.remarks} placeholder="Remarks"
        onChange={e => onChange('remarks', e.target.value)}
        status={state.status === 'not_ok' && !state.remarks ? 'warning' : undefined}
      />
    </td>
  </tr>
);

// ─── Main component ───────────────────────────────────────────────────────────

const HTPreCommissionForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [checklists, setChecklists] = useState<AllChecklists>(buildChecklists);
  const [tests, setTests] = useState<AllTests>(buildTests);
  const [submitting, setSubmitting] = useState(false);

  const inspectorName = (user as any)?.name
    ? `${(user as any).name}${(user as any).surname ? ' ' + (user as any).surname : ''}`
    : user?.email?.split('@')[0] ?? 'Current User';

  // ── Checklist handlers ────────────────────────────────────────────────────

  const handleCheckChange = useCallback(
    (secId: string, itemId: string, field: 'status' | 'remarks', val: string) => {
      setChecklists(prev => ({
        ...prev,
        [secId]: { ...prev[secId], [itemId]: { ...prev[secId][itemId], [field]: val } },
      }));
    }, [],
  );

  // ── Test handlers ─────────────────────────────────────────────────────────

  const handleTestChange = useCallback(
    (testId: string, field: keyof TestState, val: string) => {
      setTests(prev => ({ ...prev, [testId]: { ...prev[testId], [field]: val } }));
    }, [],
  );

  // ── Auto final status ─────────────────────────────────────────────────────

  const autoFinalStatus = hasAnyFail(checklists, tests) ? 'NOT READY' : 'READY FOR ENERGIZATION';
  const criticalFail = hasCriticalFail(checklists, tests);
  const score = calcScore(checklists);
  const scoreColor = score >= 80 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f';

  // ── Save / Submit ─────────────────────────────────────────────────────────

  const save = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      try { await form.validateFields(); } catch {
        message.error('Please fill in all required fields.');
        return;
      }
      const allTestsFilled = ELECTRICAL_TESTS.every(t => tests[t.id]?.observed_value);
      if (!allTestsFilled) {
        message.error('All electrical test observed values are required.');
        return;
      }
      if (criticalFail) {
        message.error('Resolve critical failures before submitting.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const values = form.getFieldsValue();

      // Serialize checklists as flat key-value pairs
      const checklistPayload: Record<string, string> = {};
      CHECKLIST_SECTIONS.forEach(sec =>
        sec.items.forEach(item => {
          const st = checklists[sec.id]?.[item.id];
          checklistPayload[`${sec.id}__${item.id}`] = `${st?.status ?? ''}|${st?.remarks ?? ''}`;
        })
      );

      // Serialize tests
      const testPayload: Record<string, string> = {};
      ELECTRICAL_TESTS.forEach(t => {
        const st = tests[t.id];
        testPayload[`test_${t.id}_value`]   = st.observed_value;
        testPayload[`test_${t.id}_result`]  = st.result;
        testPayload[`test_${t.id}_remarks`] = st.remarks;
      });

      const payload = {
        project_name:    values.project_name ?? '',
        location:        values.location ?? '',
        cable_id:        values.cable_id ?? '',
        voltage_level:   values.voltage_level ?? '',
        cable_type:      values.cable_type ?? '',
        cable_size:      values.cable_size ?? '',
        from_location:   values.from_location ?? '',
        to_location:     values.to_location ?? '',
        laying_method:   values.laying_method ?? '',
        inspection_date: values.inspection_date
          ? dayjs(values.inspection_date).format('YYYY-MM-DD') : null,
        contractor_name: values.contractor_name ?? '',
        final_status:    autoFinalStatus,
        status,
        ready_for_energization: values.ready_for_energization ?? '',
        final_remarks:   values.final_remarks ?? '',
        approval_date:   values.approval_date
          ? dayjs(values.approval_date).format('YYYY-MM-DD') : null,
        // Approval signatures
        ...APPROVAL_ROLES.reduce((acc, role) => ({
          ...acc,
          [`sig_${role.id}_name`]:      values[`sig_${role.id}_name`] ?? '',
          [`sig_${role.id}_signature`]: values[`sig_${role.id}_signature`] ?? '',
          [`sig_${role.id}_date`]: values[`sig_${role.id}_date`]
            ? dayjs(values[`sig_${role.id}_date`]).format('YYYY-MM-DD') : '',
        }), {}),
        ...checklistPayload,
        ...testPayload,
      };

      await inspectionService.createHTPreCommissionForm(payload);
      message.success(status === 'draft' ? 'Draft saved.' : 'Form submitted successfully.');
      if (status === 'submitted') navigate('/dashboard/inspection/forms/ht-precommission/list');
    } catch (err: any) {
      message.error(err?.response?.data?.detail ?? err?.response?.data?.error ?? 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="HT Cable Pre-Commissioning Checklist"
      subtitle="Create new HT Pre-Commission inspection form"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'HT Pre-Commission', href: '/dashboard/inspection/forms/ht-precommission/list' },
        { title: 'Create' },
      ]}
      actions={[
        <Button key="cancel" icon={<CloseOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/ht-precommission/list')}>
          Cancel
        </Button>,
        <Button key="draft" icon={<SaveOutlined />} loading={submitting}
          onClick={() => save('draft')}>
          Save Draft
        </Button>,
        <Tooltip key="submit-tip" title={criticalFail ? 'Resolve critical failures first' : ''}>
          <Button type="primary" icon={<SendOutlined />} loading={submitting}
            disabled={criticalFail} onClick={() => save('submitted')}>
            Submit Final
          </Button>
        </Tooltip>,
      ]}
    >
      <div className="space-y-4">

        {/* ── Score / Status Banner ── */}
        <div className="flex flex-wrap gap-4 items-center rounded-lg px-4 py-3 shadow-sm"
          style={{ background: 'var(--color-ui-base, #fff)', border: '1px solid var(--color-border, #e5e7eb)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
              Checklist Score
            </span>
            <Progress type="circle" percent={score} size={52} strokeColor={scoreColor}
              format={p => <span style={{ fontSize: 11, fontWeight: 600 }}>{p}%</span>} />
          </div>
          <Tag
            color={criticalFail ? 'error' : hasAnyFail(checklists, tests) ? 'warning' : score > 0 ? 'success' : 'default'}
            style={{ fontSize: 13, padding: '4px 12px' }}>
            {autoFinalStatus}
          </Tag>
          {criticalFail && (
            <Alert type="error" showIcon icon={<WarningOutlined />}
              message="Submit blocked — resolve critical failures first." style={{ flex: 1 }} />
          )}
        </div>

        {/* ── Section 1: General Information ── */}
        <Card
          title={<span className="font-semibold">1. General Information</span>}
          size="small"
          style={{ background: 'var(--color-ui-base, #fff)' }}
        >
          <Form form={form} layout="vertical">
            <Row gutter={[16, 0]}>
              {GENERAL_FIELDS.map(f => (
                <Col xs={24} sm={12} md={8} key={f.name}>
                  <Form.Item
                    label={f.label} name={f.name}
                    rules={f.required ? [{ required: true, message: `${f.label} is required` }] : []}
                  >
                    {f.type === 'select' ? (
                      <Select placeholder={`Select ${f.label}`}>
                        {f.options?.map(o => <Option key={o} value={o}>{o}</Option>)}
                      </Select>
                    ) : f.type === 'date' ? (
                      <DatePicker className="w-full" />
                    ) : (
                      <Input placeholder={f.label} />
                    )}
                  </Form.Item>
                </Col>
              ))}
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Inspector">
                  <Input value={inspectorName} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* ── Sections 2–5, 7, 8: Config-driven Checklists ── */}
        <Collapse defaultActiveKey={CHECKLIST_SECTIONS.map(s => s.id)}
          style={{ background: 'var(--color-ui-base, #fff)' }}>
          {CHECKLIST_SECTIONS.map(sec => {
            const done   = sectionDone(sec.id, checklists);
            const failed = sectionFailed(sec.id, checklists);
            return (
              <Panel
                key={sec.id}
                header={
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-semibold text-sm">{sec.title}</span>
                    <Tag color={failed ? 'error' : done ? 'success' : 'default'}>
                      {failed ? '❌ Failed' : done ? '✔ Complete' : 'Pending'}
                    </Tag>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm" style={{ minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg-subtle, #f9fafb)' }}>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 w-8 text-center">#</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Checkpoint</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 w-36 text-center">Status</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.items.map((item, idx) => (
                        <ChecklistRow
                          key={item.id}
                          idx={idx + 1}
                          label={item.label}
                          isCritical={item.isCritical}
                          state={checklists[sec.id]?.[item.id] ?? { status: '', remarks: '' }}
                          onChange={(field, val) => handleCheckChange(sec.id, item.id, field, val)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}
        </Collapse>

        {/* ── Section 6: Electrical Testing ── */}
        <Card
          title={
            <div className="flex items-center justify-between">
              <span className="font-semibold">6. Electrical Testing</span>
              <Tag color={
                ELECTRICAL_TESTS.some(t => tests[t.id]?.result === 'FAIL') ? 'error' :
                ELECTRICAL_TESTS.every(t => tests[t.id]?.observed_value) ? 'success' : 'default'
              }>
                {ELECTRICAL_TESTS.some(t => tests[t.id]?.result === 'FAIL') ? '❌ Failed' :
                 ELECTRICAL_TESTS.every(t => tests[t.id]?.observed_value) ? '✔ Complete' : 'Pending'}
              </Tag>
            </div>
          }
          size="small"
          style={{ background: 'var(--color-ui-base, #fff)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-subtle, #f9fafb)' }}>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Test Name</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 w-40 text-center">Standard Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 w-36 text-center">Observed Value *</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 w-28 text-center">Result</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {ELECTRICAL_TESTS.map(t => {
                  const st = tests[t.id];
                  const isFail = st.result === 'FAIL';
                  return (
                    <tr key={t.id}
                      style={{ background: isFail ? 'var(--color-error-bg, #fff1f0)' : undefined }}>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-sm">
                        {t.test_name}
                        {t.isCritical && <Tag color="orange" className="ml-2 text-xs">Critical</Tag>}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-xs"
                        style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
                        {t.standard_value}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1">
                        <Input
                          size="small" value={st.observed_value} placeholder="Enter value"
                          onChange={e => handleTestChange(t.id, 'observed_value', e.target.value)}
                          status={!st.observed_value ? 'warning' : undefined}
                        />
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1">
                        <Select
                          size="small" className="w-full"
                          value={st.result || undefined} placeholder="Result"
                          onChange={val => handleTestChange(t.id, 'result', val)}
                          status={isFail ? 'error' : undefined}
                        >
                          <Option value="PASS">
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />PASS
                          </Option>
                          <Option value="FAIL">
                            <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />FAIL
                          </Option>
                        </Select>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1">
                        <Input
                          size="small" value={st.remarks} placeholder="Remarks"
                          onChange={e => handleTestChange(t.id, 'remarks', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Section 9: Final Approval ── */}
        <Card
          title={<span className="font-semibold">9. Final Approval</span>}
          size="small"
          style={{ background: 'var(--color-ui-base, #fff)' }}
        >
          <Form form={form} layout="vertical">
            {/* Final status display */}
            <div className="mb-4 p-3 rounded-lg flex items-center gap-3"
              style={{
                background: autoFinalStatus === 'READY FOR ENERGIZATION'
                  ? 'var(--color-success-bg, #f6ffed)'
                  : 'var(--color-error-bg, #fff1f0)',
                border: `1px solid ${autoFinalStatus === 'READY FOR ENERGIZATION' ? '#b7eb8f' : '#ffa39e'}`,
              }}>
              <span className="text-sm font-medium">Auto-calculated Final Status:</span>
              <Tag color={autoFinalStatus === 'READY FOR ENERGIZATION' ? 'success' : 'error'}
                style={{ fontSize: 13, padding: '2px 10px' }}>
                {autoFinalStatus}
              </Tag>
            </div>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Ready for Energization" name="ready_for_energization"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Select placeholder="Select">
                    <Option value="yes">
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />Yes
                    </Option>
                    <Option value="no">
                      <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />No
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Approval Date" name="approval_date">
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} md={24}>
                <Form.Item label="Final Remarks" name="final_remarks">
                  <TextArea rows={2} placeholder="Final remarks or observations" />
                </Form.Item>
              </Col>
            </Row>

            {/* Approval signatures — config-driven */}
            <Divider orientation="left" style={{ fontSize: 13 }}>Approval Signatures</Divider>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ minWidth: 600 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-subtle, #f9fafb)' }}>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Role</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Name *</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Signature</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {APPROVAL_ROLES.map(role => (
                    <tr key={role.id}>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium text-sm">
                        {role.label}
                        {role.required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1">
                        <Form.Item name={`sig_${role.id}_name`} className="mb-0"
                          rules={role.required ? [{ required: true, message: 'Name required' }] : []}>
                          <Input size="small" placeholder="Full name" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1">
                        <Form.Item name={`sig_${role.id}_signature`} className="mb-0"
                          rules={role.required ? [{ required: true, message: 'Signature required' }] : []}>
                          <Input size="small" placeholder="Type name as signature" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1">
                        <Form.Item name={`sig_${role.id}_date`} className="mb-0">
                          <DatePicker size="small" className="w-full" />
                        </Form.Item>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Form>
        </Card>

        {/* ── Bottom action bar ── */}
        <Divider />
        <div className="flex justify-end gap-3 flex-wrap pb-4">
          <Button onClick={() => navigate('/dashboard/inspection/forms/ht-precommission/list')}>
            Cancel
          </Button>
          <Button icon={<SaveOutlined />} loading={submitting} onClick={() => save('draft')}>
            Save Draft
          </Button>
          <Tooltip title={criticalFail ? 'Resolve critical failures first' : ''}>
            <Button type="primary" icon={<SendOutlined />} loading={submitting}
              disabled={criticalFail} onClick={() => save('submitted')}>
              Submit Final
            </Button>
          </Tooltip>
        </div>

      </div>
    </PageLayout>
  );
};

export default HTPreCommissionForm;
