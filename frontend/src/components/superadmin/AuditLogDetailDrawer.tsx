import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/lib/toast';

interface AuditLog {
  id: number;
  timestamp: string;
  user: number | null;
  user_email: string;
  action: string;
  module: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  request_data: any;
  response_data: any;
  status: 'success' | 'failure';
}

interface Props {
  log: AuditLog;
  onClose: () => void;
}

export default function AuditLogDetailDrawer({ log, onClose }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const renderJSON = (data: any) => {
    if (!data || Object.keys(data).length === 0) {
      return <span className="text-gray-500 text-sm">No data</span>;
    }
    return (
      <pre className="bg-black/30 p-4 rounded-lg overflow-x-auto text-xs text-gray-300 font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1 hover:bg-white/10 rounded transition-colors"
      title="Copy to clipboard"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0a0a0a] border-l border-white/10 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/10 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Audit Log Details</h2>
            <p className="text-sm text-gray-400">Event ID: {log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              log.status === 'success'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {log.status.toUpperCase()}
            </span>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Timestamp</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-white">{formatDate(log.timestamp)}</span>
                <CopyButton text={log.timestamp} field="Timestamp" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">User</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-white">{log.user_email || 'System'}</span>
                {log.user_email && <CopyButton text={log.user_email} field="User" />}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Action</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-white font-mono text-sm">{log.action}</span>
                <CopyButton text={log.action} field="Action" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Module</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-white">{log.module}</span>
                <CopyButton text={log.module} field="Module" />
              </div>
            </div>

            {log.resource_type && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Resource Type</label>
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                    <span className="text-white">{log.resource_type}</span>
                    <CopyButton text={log.resource_type} field="Resource Type" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Resource ID</label>
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                    <span className="text-white font-mono">{log.resource_id}</span>
                    <CopyButton text={log.resource_id} field="Resource ID" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">IP Address</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-white font-mono">{log.ip_address}</span>
                <CopyButton text={log.ip_address} field="IP Address" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">User Agent</label>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-white text-sm break-all">{log.user_agent}</span>
                <CopyButton text={log.user_agent} field="User Agent" />
              </div>
            </div>
          </div>

          {/* Request Data */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-400">Request Data</label>
              {log.request_data && Object.keys(log.request_data).length > 0 && (
                <CopyButton text={JSON.stringify(log.request_data, null, 2)} field="Request Data" />
              )}
            </div>
            {renderJSON(log.request_data)}
          </div>

          {/* Response Data */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-400">Response Data</label>
              {log.response_data && Object.keys(log.response_data).length > 0 && (
                <CopyButton text={JSON.stringify(log.response_data, null, 2)} field="Response Data" />
              )}
            </div>
            {renderJSON(log.response_data)}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/10 p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
