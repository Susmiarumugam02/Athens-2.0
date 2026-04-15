import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shield, Edit, ArrowLeft, Upload, Clock } from 'lucide-react';
import { safetyObservationApi, type AuditLog } from './api';
import AttachmentUploader from './AttachmentUploader';
import AttachmentGallery from './AttachmentGallery';
import toast from 'react-hot-toast';

const SafetyObservationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [observation, setObservation] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  useEffect(() => {
    loadObservation();
    loadAttachments();
  }, [id]);
  
  const loadObservation = async () => {
    try {
      const response = await safetyObservationApi.getById(id!);
      setObservation(response.data);
    } catch (error) {
      toast.error('Failed to load observation');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAttachments = async () => {
    try {
      const response = await safetyObservationApi.listAttachments(id!);
      setAttachments(response.data);
    } catch (error) {
      console.error('Failed to load attachments');
    }
  };
  
  const loadAuditLogs = async () => {
    if (historyLoaded) return;
    try {
      const response = await safetyObservationApi.getAuditLogs(id!);
      setAuditLogs(response.data.results);
      setHistoryLoaded(true);
    } catch (error) {
      console.error('Failed to load audit logs');
    }
  };
  
  const handleTabChange = (tab: 'details' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history') {
      loadAuditLogs();
    }
  };
  
  const handleTransition = async (toStatus: 'draft' | 'submitted' | 'closed') => {
    try {
      await safetyObservationApi.transition(id!, toStatus);
      toast.success(`Status changed to ${toStatus}`);
      loadObservation();
      setHistoryLoaded(false); // Reload history on next view
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Status change failed');
    }
  };
  
  if (loading) return <div className="p-6">Loading...</div>;
  if (!observation) return <div className="p-6">Not found</div>;
  
  const canEdit = observation.observationStatus === 'draft';
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app/safety-observation/list')} className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Observation #{observation.observationID}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            observation.observationStatus === 'draft' ? 'bg-gray-100 text-gray-800' :
            observation.observationStatus === 'submitted' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }`}>
            {observation.observationStatus}
          </span>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => navigate(`/app/safety-observation/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
          {observation.observationStatus === 'draft' && (
            <button
              onClick={() => handleTransition('submitted')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit
            </button>
          )}
          {observation.observationStatus === 'submitted' && (
            <>
              <button
                onClick={() => handleTransition('closed')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Close
              </button>
              <button
                onClick={() => handleTransition('draft')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Reopen
              </button>
            </>
          )}
          {observation.observationStatus === 'closed' && (
            <button
              onClick={() => handleTransition('submitted')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-border mb-6">
        <button
          onClick={() => handleTabChange('details')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          History
        </button>
      </div>
      
      {activeTab === 'details' ? (
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Type</label>
            <p className="font-medium">{observation.typeOfObservation}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Severity</label>
            <p className="font-medium capitalize">{observation.severity}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Location</label>
            <p className="font-medium">{observation.workLocation}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <p className="font-medium">{observation.observationStatus}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Assigned To</label>
            <p className="font-medium">{observation.correctiveActionAssignedTo || <span className="text-muted-foreground">Unassigned</span>}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Target Close Date</label>
            <p className="font-medium">
              {observation.target_close_date || '-'}
              {observation.is_overdue && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                  Overdue by {Math.abs(observation.days_until_due)} days
                </span>
              )}
              {observation.is_due_soon && !observation.is_overdue && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                  Due in {observation.days_until_due} days
                </span>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Created</label>
            <p className="font-medium">{new Date(observation.created_at).toLocaleString()}</p>
          </div>
        </div>
        {observation.remarks && (
          <div>
            <label className="text-sm text-muted-foreground">Remarks</label>
            <p className="mt-1">{observation.remarks}</p>
          </div>
        )}
        
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Attachments ({attachments.length})</h3>
            {canEdit && (
              <button
                onClick={() => setShowUploader(!showUploader)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-accent rounded-lg hover:bg-accent/80"
              >
                <Upload className="h-4 w-4" />
                {showUploader ? 'Hide' : 'Upload'}
              </button>
            )}
          </div>
          
          {showUploader && (
            <div className="mb-4">
              <AttachmentUploader
                observationId={id!}
                onUploadSuccess={() => {
                  loadAttachments();
                  setShowUploader(false);
                  setHistoryLoaded(false); // Reload history
                }}
              />
            </div>
          )}
          
          <AttachmentGallery
            observationId={id!}
            attachments={attachments}
            canDelete={canEdit}
            onDelete={() => {
              loadAttachments();
              setHistoryLoaded(false); // Reload history
            }}
          />
        </div>
      </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Change History</h3>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No history recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const renderDiff = () => {
                  if (log.action === 'Created') return null;
                  if (log.action === 'Status Changed') {
                    return (
                      <span className="text-sm text-muted-foreground">
                        {log.old_value} → {log.new_value}
                      </span>
                    );
                  }
                  if (log.field_name && log.old_value && log.new_value) {
                    return (
                      <span className="text-sm text-muted-foreground">
                        {log.field_name}: {log.old_value} → {log.new_value}
                      </span>
                    );
                  }
                  if (log.details) {
                    return <span className="text-sm text-muted-foreground">{log.details}</span>;
                  }
                  return null;
                };
                
                return (
                  <div key={log.id} className="bg-accent/50 rounded-lg p-4 border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-foreground">{log.user}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{log.action}</span>
                      {renderDiff()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafetyObservationDetail;
