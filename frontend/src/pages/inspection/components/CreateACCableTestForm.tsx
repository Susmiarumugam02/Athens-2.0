import React, { useState, useCallback } from 'react';
import {
  Form, Card, Button, Space, message, Alert, Progress, Divider, Tag,
} from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined, SendOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import PageLayout from '../../../components/ui/PageLayout';
import { inspectionService } from '../services/inspectionService';
import { useAuthStore } from '../../../store/authStore';

import GeneralInfoSection from './forms/GeneralInfoSection';
import ChecklistSection, {
  DEFAULT_CHECKLIST,
  CRITICAL_CHECKLIST_KEYS,
  type ChecklistState,
  type ChecklistValue,
} from './forms/ChecklistSection';
import TestingSection, { IR_THRESHOLD } from './forms/TestingSection';
import ObservationSection from './forms/ObservationSection';

// ─── helpers ────────────────────────────────────────────────────────────────

function calculateScore(checklist: ChecklistState): number {
  const values = Object.values(checklist);
  const scoreable = values.filter((v) => v !== 'na');
  if (scoreable.length === 0) return 0;
  const ok = scoreable.filter((v) => v === 'ok').length;
  return Math.round((ok / scoreable.length) * 100);
}

function evaluateSafety(
  checklist: ChecklistState,
  irPP: number | null,
  irPE: number | null,
  continuity: string | undefined,
): boolean {
  if (irPP !== null && irPP < IR_THRESHOLD) return false;
  if (irPE !== null && irPE < IR_THRESHOLD) return false;
  if (continuity === 'fail') return false;
  for (const key of CRITICAL_CHECKLIST_KEYS) {
    if (checklist[key] === 'not_ok') return false;
  }
  return true;
}

function hasCriticalFailure(
  checklist: ChecklistState,
  irPP: number | null,
  irPE: number | null,
): boolean {
  if (irPP !== null && irPP < IR_THRESHOLD) return true;
  if (irPE !== null && irPE < IR_THRESHOLD) return true;
  for (const key of CRITICAL_CHECKLIST_KEYS) {
    if (checklist[key] === 'not_ok') return true;
  }
  return false;
}

// ─── component ──────────────────────────────────────────────────────────────

const CreateACCableTestForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [checklist, setChecklist] = useState<ChecklistState>(DEFAULT_CHECKLIST);
  const [submitting, setSubmitting] = useState(false);

  // Watched values for live feedback
  const irPhasePhase: number | null = Form.useWatch('ir_phase_phase', form) ?? null;
  const irPhaseEarth: number | null = Form.useWatch('ir_phase_earth', form) ?? null;
  const continuity: string | undefined = Form.useWatch('continuity_test', form);

  const score = calculateScore(checklist);
  const isSafe = evaluateSafety(checklist, irPhasePhase, irPhaseEarth, continuity);
  const criticalFailure = hasCriticalFailure(checklist, irPhasePhase, irPhaseEarth);

  const inspectorName =
    user?.name
      ? `${user.name}${user.surname ? ' ' + user.surname : ''}`
      : user?.email?.split('@')[0] ?? 'Current User';

  const handleChecklistChange = useCallback(
    (key: keyof ChecklistState, value: ChecklistValue) => {
      setChecklist((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── submit ────────────────────────────────────────────────────────────────

  const buildPayload = (values: any, status: 'draft' | 'in_progress' | 'completed') => ({
    // General
    contractor: values.contractor ?? '',
    date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : null,
    block_no: values.block_no ?? '',
    work_description: values.title ?? 'AC Cable Laying (Testing)',
    ref_drg_no: values.ref_drg_no ?? '',
    cable_size: values.cable_size ?? '',
    from_to: values.from_to ?? '',
    // Enhanced
    cable_id: values.cable_id ?? '',
    voltage_rating: values.voltage_rating ?? '',
    cable_type: values.cable_type ?? '',
    status,
    // Checklist
    visual_checklist: checklist,
    // Testing
    ir_phase_phase: values.ir_phase_phase ?? null,
    ir_phase_earth: values.ir_phase_earth ?? null,
    continuity_test: values.continuity_test ?? '',
    earth_continuity_ohms: values.earth_continuity_ohms ?? null,
    hv_test_value: values.hv_test_value ? String(values.hv_test_value) : '',
    phase_sequence: values.phase_sequence ?? '',
    // Observations
    observations: values.observations ?? '',
    risk_level: values.risk_level ?? '',
    corrective_action: values.corrective_action ?? '',
    is_safe: isSafe,
    score,
  });

  const submit = async (status: 'draft' | 'in_progress' | 'completed') => {
    try {
      await form.validateFields();
    } catch {
      message.error('Please fix the validation errors before submitting.');
      return;
    }

    if (status === 'completed' && criticalFailure) {
      message.error('Cannot submit: critical failure detected. Resolve issues first.');
      return;
    }

    setSubmitting(true);
    try {
      const values = form.getFieldsValue();
      const payload = buildPayload(values, status);
      await inspectionService.createACCableForm(payload);
      message.success(
        status === 'draft'
          ? 'Form saved as draft.'
          : 'AC Cable Testing Form submitted successfully.',
      );
      navigate('/app/inspection/create');
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ??
        err?.response?.data?.error ??
        'Failed to save form. Please try again.';
      message.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // ── score badge colour ────────────────────────────────────────────────────

  const scoreColor =
    score >= 80 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f';

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="AC Cable Testing Forms"
      subtitle="Create a new AC Cable Testing inspection record"
      icon={<ExperimentOutlined />}
      breadcrumbs={[
        { title: 'Inspections', href: '/app/inspection' },
        { title: 'Create', href: '/app/inspection/create' },
        { title: 'AC Cable Testing' },
      ]}
      actions={
        <Space wrap>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/app/inspection/create')}
          >
            Back to Forms
          </Button>
          <Button
            icon={<SaveOutlined />}
            loading={submitting}
            onClick={() => submit('draft')}
          >
            Save as Draft
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            disabled={criticalFailure}
            onClick={() => submit('completed')}
            title={criticalFailure ? 'Resolve critical failures before submitting' : undefined}
          >
            Submit
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        scrollToFirstError
        initialValues={{ is_safe: true }}
      >
        <div className="space-y-4">

          {/* ── Live score + safety banner ── */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
              <span className="text-sm text-gray-500 font-medium">Checklist Score</span>
              <Progress
                type="circle"
                percent={score}
                size={48}
                strokeColor={scoreColor}
                format={(p) => <span style={{ fontSize: 11, fontWeight: 600 }}>{p}%</span>}
              />
            </div>

            <Tag
              color={isSafe ? 'success' : 'error'}
              style={{ fontSize: 13, padding: '4px 12px' }}
            >
              {isSafe ? '✅ Safe for Energization' : '⚠️ NOT Safe for Energization'}
            </Tag>

            {criticalFailure && (
              <Alert
                type="error"
                showIcon
                message="Critical failure detected — Submit is disabled until resolved."
                style={{ flex: 1 }}
              />
            )}
          </div>

          {/* ── 1. General Information ── */}
          <Card
            title={<span className="font-semibold">1. General Information</span>}
            size="small"
          >
            <GeneralInfoSection inspectorName={inspectorName} />
          </Card>

          {/* ── 2. Visual Inspection Checklist ── */}
          <Card
            title={<span className="font-semibold">2. Visual Inspection Checklist</span>}
            size="small"
            extra={
              <span className="text-xs text-gray-400">
                Toggle each item: OK / NOT OK / N/A
              </span>
            }
          >
            <ChecklistSection
              checklist={checklist}
              onChange={handleChecklistChange}
            />
          </Card>

          {/* ── 3. Testing Parameters ── */}
          <Card
            title={<span className="font-semibold">3. Testing Parameters</span>}
            size="small"
          >
            <TestingSection
              irPhasePhase={irPhasePhase}
              irPhaseEarth={irPhaseEarth}
            />
          </Card>

          {/* ── 4–7. Observations, Risk, Corrective, Safety ── */}
          <Card
            title={<span className="font-semibold">4. Observations & Final Status</span>}
            size="small"
          >
            <ObservationSection />
          </Card>

          {/* ── Bottom action bar (mirrors header) ── */}
          <Divider />
          <div className="flex justify-end">
            <Space wrap>
              <Button onClick={() => navigate('/app/inspection/create')}>
                Cancel
              </Button>
              <Button
                icon={<SaveOutlined />}
                loading={submitting}
                onClick={() => submit('draft')}
              >
                Save as Draft
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                disabled={criticalFailure}
                onClick={() => submit('completed')}
              >
                Submit
              </Button>
            </Space>
          </div>

        </div>
      </Form>
    </PageLayout>
  );
};

export default CreateACCableTestForm;
