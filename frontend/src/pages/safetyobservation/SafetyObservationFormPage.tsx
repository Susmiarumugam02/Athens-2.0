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
    observationStatus: 'draft'
  });
  
  useEffect(() => {
    loadUsers();
    if (id) loadObservation();
  }, [id]);
  
  const loadUsers = async () => {
    try {
      const response = await safetyObservationApi.getProjectUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users');
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
    if (current.includes(value)) {
      setFormData({...formData, classification: current.filter(v => v !== value)});
    } else {
      setFormData({...formData, classification: [...current, value]});
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.observationStatus !== 'draft') {
      toast.error('Can only edit observations in draft status');
      return;
    }
    
    setLoading(true);
    try {
      const submitData = { ...formData };
      // Send null instead of empty string for optional dates
      if (!submitData.target_close_date) submitData.target_close_date = null;
      if (!submitData.commitmentDate) submitData.commitmentDate = null;
      
      if (id) {
        await safetyObservationApi.update(id, submitData);
        toast.success('Observation updated');
      } else {
        await safetyObservationApi.create(submitData);
        toast.success('Observation created');
      }
      navigate('/app/safety-observation/list');
    } catch (error: any) {
      // Show field-specific errors if available
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
  
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{id ? 'Edit' : 'New'} Safety Observation</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
        {id && formData.observationStatus !== 'draft' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            ⚠️ This observation is {formData.observationStatus}. Only draft observations can be edited.
          </div>
        )}
        
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input
                type="date"
                required
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Time *</label>
              <input
                type="time"
                required
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Reported By *</label>
              <input
                type="text"
                required
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.reportedBy}
                onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <input
                type="text"
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Work Location *</label>
              <input
                type="text"
                required
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.workLocation}
                onChange={(e) => setFormData({...formData, workLocation: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Activity Performing</label>
              <input
                type="text"
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.activityPerforming}
                onChange={(e) => setFormData({...formData, activityPerforming: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-2">Contractor Name</label>
              <input
                type="text"
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.contractorName}
                onChange={(e) => setFormData({...formData, contractorName: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              />
            </div>
          </div>
        </div>
        
        {/* Observation Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Observation Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type of Observation *</label>
              <select
                required
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.typeOfObservation}
                onChange={(e) => setFormData({...formData, typeOfObservation: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              >
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
                    <input
                      type="checkbox"
                      disabled={id && formData.observationStatus !== 'draft'}
                      checked={formData.classification.includes(cls.value)}
                      onChange={() => handleClassificationChange(cls.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{cls.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Safety Observation Found *</label>
              <textarea
                required
                rows={3}
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.safetyObservationFound}
                onChange={(e) => setFormData({...formData, safetyObservationFound: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
                placeholder="Describe the safety observation in detail..."
              />
            </div>
          </div>
        </div>
        
        {/* Risk Assessment */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Severity *</label>
              <select
                required
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.severity}
                onChange={(e) => setFormData({...formData, severity: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              >
                <option value={1}>1 - Low</option>
                <option value={2}>2 - Medium</option>
                <option value={3}>3 - High</option>
                <option value={4}>4 - Critical</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Likelihood *</label>
              <select
                required
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.likelihood}
                onChange={(e) => setFormData({...formData, likelihood: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
              >
                <option value={1}>1 - Rare</option>
                <option value={2}>2 - Possible</option>
                <option value={3}>3 - Likely</option>
                <option value={4}>4 - Certain</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Risk Score</label>
              <input
                type="text"
                disabled
                value={formData.severity * formData.likelihood}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg font-bold text-lg text-center"
              />
            </div>
          </div>
        </div>
        
        {/* CAPA Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Corrective & Preventive Action</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Corrective/Preventive Action *</label>
              <textarea
                required
                rows={3}
                disabled={id && formData.observationStatus !== 'draft'}
                value={formData.correctivePreventiveAction}
                onChange={(e) => setFormData({...formData, correctivePreventiveAction: e.target.value})}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
                placeholder="Describe the corrective and preventive actions..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Assign To</label>
                <select
                  disabled={id && formData.observationStatus !== 'draft'}
                  value={formData.correctiveActionAssignedTo}
                  onChange={(e) => setFormData({...formData, correctiveActionAssignedTo: e.target.value})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
                >
                  <option value="">Select user</option>
                  {users.map(u => (
                    <option key={u.username} value={u.username}>{u.display_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Commitment Date</label>
                <input
                  type="date"
                  disabled={id && formData.observationStatus !== 'draft'}
                  value={formData.commitmentDate || ''}
                  onChange={(e) => setFormData({...formData, commitmentDate: e.target.value})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Target Close Date</label>
                <input
                  type="date"
                  disabled={id && formData.observationStatus !== 'draft'}
                  value={formData.target_close_date || ''}
                  onChange={(e) => setFormData({...formData, target_close_date: e.target.value})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Remarks</label>
            <textarea
              rows={3}
              disabled={id && formData.observationStatus !== 'draft'}
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg disabled:opacity-50"
            />
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          {(!id || formData.observationStatus === 'draft') && (
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/app/safety-observation/list')}
            className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80"
          >
            {id && formData.observationStatus !== 'draft' ? 'Back' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SafetyObservationFormPage;
