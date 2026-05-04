import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shield, Save } from 'lucide-react';
import { safetyObservationApi } from './api';
import toast from 'react-hot-toast';

const OBSERVATION_TYPES = [
  { value: 'unsafe_act', label: 'Unsafe Act' },
  { value: 'unsafe_condition', label: 'Unsafe Condition' },
  { value: 'safe_act', label: 'Safe Act' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'at_risk_behavior', label: 'At-Risk Behavior' },
  { value: 'improvement_opportunity', label: 'Improvement Opportunity' },
  { value: 'repeat_observation', label: 'Repeat Observation' },
  { value: 'ppe_non_compliance', label: 'PPE Non-Compliance' },
  { value: 'violation_procedure', label: 'Violation of Procedure/Permit' },
  { value: 'training_need', label: 'Training Need to be Identified' },
  { value: 'emergency_preparedness', label: 'Emergency Preparedness' },
];

const CLASSIFICATIONS = [
  { value: 'ppe_compliance', label: 'PPE - Personal Protective Equipment' },
  { value: 'procedure_deviation', label: 'Procedure Deviation' },
  { value: 'emergency_preparedness', label: 'Emergency Preparedness' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'access_egress', label: 'Access Egress' },
  { value: 'barricade', label: 'Barricade' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'material_handling', label: 'Material Handling' },
  { value: 'work_at_height', label: 'Work at Height' },
  { value: 'environment_hygiene', label: 'Environment & Hygiene' },
  { value: 'permit', label: 'Permit' },
  { value: 'civil', label: 'Civil' },
  { value: 'chemical_exposure', label: 'Chemical Exposure' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'machinery_equipment', label: 'Machinery & Equipment' },
];

const OBSERVATION_STATUSES = [
  { value: 'open', label: 'Open', color: '#dc2626' },
  { value: 'in_progress', label: 'In Progress', color: '#ea580c' },
  { value: 'pending_verification', label: 'Pending Verification', color: '#2563eb' },
  { value: 'closed', label: 'Closed', color: '#16a34a' },
  { value: 'rejected', label: 'Rejected', color: '#7f1d1d' },
];

const SafetyObservationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    reportedBy: '',
    department: '',
    workLocation: '',
    activityPerforming: '',
    contractorName: '',
    typeOfObservation: 'unsafe_act',
    classification: [] as string[],
    safetyObservationFound: '',
    severity: 1,
    likelihood: 1,
    correctivePreventiveAction: '',
    correctiveActionAssignedTo: '',
    commitmentDate: '',
    target_close_date: '',
    remarks: '',
    observationStatus: 'open',
  });

  // true when editing a closed record — all fields become read-only
  const isClosed = !!id && formData.observationStatus === 'closed';

  useEffect(() => {
    loadUsers();
    if (id) loadObservation();
  }, [id]);

  const loadUsers = async () => {
    try {
      const response = await safetyObservationApi.getProjectUsers();
      setUsers(response.data.users || []);
    } catch (error) {
    }
  };

  const loadObservation = async () => {
    try {
      const response = await safetyObservationApi.getById(id!);
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to load observation');
    }
  };

  const handleClassificationChange = (value: string) => {
    const current = formData.classification;
    setFormData({
      ...formData,
      classification: current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isClosed) {
      toast.error('Cannot edit a closed observation');
      return;
    }

    setLoading(true);
    try {
      const submitData = { ...formData };
      if (!submitData.target_close_date) (submitData as any).target_close_date = null;
      if (!submitData.commitmentDate) (submitData as any).commitmentDate = null;

      if (id) {
        await safetyObservationApi.update(id, submitData);
        toast.success('Observation updated');
      } else {
        await safetyObservationApi.create(submitData);
        toast.success('Observation created');
      }
      navigate('/app/safety-observation/list');
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            toast.error(`${field}: ${messages.join(', ')}`);
          } else if (typeof messages === 'string') {
            toast.error(messages);
          }
        });
      } else {
        toast.error(errorData?.error || 'Failed to save observation');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-4 py-2 bg-background border border-border rounded-lg${isClosed ? ' opacity-50 cursor-not-allowed' : ''}`;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{id ? 'Edit' : 'New'} Safety Observation</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
        {isClosed && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            ⚠️ This observation is closed and cannot be edited.
          </div>
        )}

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input type="date" required disabled={isClosed} value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time *</label>
              <input type="time" required disabled={isClosed} value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reported By *</label>
              <input type="text" required disabled={isClosed} value={formData.reportedBy}
                onChange={e => setFormData({...formData, reportedBy: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <input type="text" disabled={isClosed} value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Work Location *</label>
              <input type="text" required disabled={isClosed} value={formData.workLocation}
                onChange={e => setFormData({...formData, workLocation: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Activity Performing</label>
              <input type="text" disabled={isClosed} value={formData.activityPerforming}
                onChange={e => setFormData({...formData, activityPerforming: e.target.value})} className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-2">Contractor Name</label>
              <input type="text" disabled={isClosed} value={formData.contractorName}
                onChange={e => setFormData({...formData, contractorName: e.target.value})} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Observation Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Observation Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type of Observation *</label>
              <select required disabled={isClosed} value={formData.typeOfObservation}
                onChange={e => setFormData({...formData, typeOfObservation: e.target.value})} className={inputCls}>
                {OBSERVATION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Classification (Multiple)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-background border border-border rounded-lg">
                {CLASSIFICATIONS.map(cls => (
                  <label key={cls.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" disabled={isClosed}
                      checked={formData.classification.includes(cls.value)}
                      onChange={() => handleClassificationChange(cls.value)} className="rounded" />
                    <span className="text-sm">{cls.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Safety Observation Found *</label>
              <textarea required rows={3} disabled={isClosed} value={formData.safetyObservationFound}
                onChange={e => setFormData({...formData, safetyObservationFound: e.target.value})}
                className={inputCls} placeholder="Describe the safety observation in detail..." />
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Severity *</label>
              <select required disabled={isClosed} value={formData.severity}
                onChange={e => setFormData({...formData, severity: parseInt(e.target.value)})} className={inputCls}>
                <option value={1}>1 - Low</option>
                <option value={2}>2 - Medium</option>
                <option value={3}>3 - High</option>
                <option value={4}>4 - Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Likelihood *</label>
              <select required disabled={isClosed} value={formData.likelihood}
                onChange={e => setFormData({...formData, likelihood: parseInt(e.target.value)})} className={inputCls}>
                <option value={1}>1 - Rare</option>
                <option value={2}>2 - Possible</option>
                <option value={3}>3 - Likely</option>
                <option value={4}>4 - Certain</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Risk Score</label>
              <input type="text" disabled value={formData.severity * formData.likelihood}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg font-bold text-lg text-center" />
            </div>
          </div>
        </div>

        {/* CAPA */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Corrective &amp; Preventive Action</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Corrective/Preventive Action *</label>
              <textarea required rows={3} disabled={isClosed} value={formData.correctivePreventiveAction}
                onChange={e => setFormData({...formData, correctivePreventiveAction: e.target.value})}
                className={inputCls} placeholder="Describe the corrective and preventive actions..." />
            </div>

            {/* Row: Assign To | Commitment Date | Target Close Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Assign To</label>
                <select disabled={isClosed} value={formData.correctiveActionAssignedTo}
                  onChange={e => setFormData({...formData, correctiveActionAssignedTo: e.target.value})} className={inputCls}>
                  <option value="">Select user</option>
                  {users.map(u => (
                    <option key={u.username} value={u.username}>{u.display_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Commitment Date</label>
                <input type="date" disabled={isClosed} value={formData.commitmentDate || ''}
                  onChange={e => setFormData({...formData, commitmentDate: e.target.value})} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Close Date</label>
                <input type="date" disabled={isClosed} value={formData.target_close_date || ''}
                  onChange={e => setFormData({...formData, target_close_date: e.target.value})} className={inputCls} />
              </div>
            </div>

            {/* Row: Observation Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Observation Status <span className="text-red-500">*</span>
                </label>
                <select required disabled={isClosed} value={formData.observationStatus}
                  onChange={e => setFormData({...formData, observationStatus: e.target.value})} className={inputCls}>
                  {OBSERVATION_STATUSES.map(s => (
                    <option key={s.value} value={s.value} style={{ color: s.color }}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Remarks</label>
            <textarea rows={3} disabled={isClosed} value={formData.remarks}
              onChange={e => setFormData({...formData, remarks: e.target.value})} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          {!isClosed && (
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          )}
          <button type="button" onClick={() => navigate('/app/safety-observation/list')}
            className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80">
            {isClosed ? 'Back' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SafetyObservationFormPage;
