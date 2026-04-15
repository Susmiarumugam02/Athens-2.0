import React from 'react';
import { FileText, Trash2, Download } from 'lucide-react';
import { safetyObservationApi } from './api';
import toast from 'react-hot-toast';

interface Attachment {
  id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  uploaded_by_name: string;
  created_at: string;
}

interface AttachmentGalleryProps {
  observationId: string;
  attachments: Attachment[];
  canDelete?: boolean;
  onDelete: () => void;
}

const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  observationId,
  attachments,
  canDelete = false,
  onDelete
}) => {
  const handleDelete = async (attachmentId: number) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await safetyObservationApi.deleteAttachment(observationId, attachmentId);
      toast.success('Attachment deleted');
      onDelete();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No attachments
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {attachments.map((att) => {
        const isImage = att.mime_type.startsWith('image/');
        
        return (
          <div key={att.id} className="border border-border rounded-lg overflow-hidden">
            {isImage ? (
              <img src={att.file_url} alt={att.file_name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-accent flex items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="p-2">
              <p className="text-xs truncate font-medium">{att.file_name}</p>
              <p className="text-xs text-muted-foreground">{att.file_type}</p>
              <div className="flex gap-2 mt-2">
                <a
                  href={att.file_url}
                  download
                  className="flex-1 text-xs px-2 py-1 bg-accent rounded hover:bg-accent/80 flex items-center justify-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttachmentGallery;
