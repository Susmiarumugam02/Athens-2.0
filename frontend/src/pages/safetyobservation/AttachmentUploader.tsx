import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { safetyObservationApi } from './api';
import toast from 'react-hot-toast';

interface AttachmentUploaderProps {
  observationId: string;
  onUploadSuccess: () => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  observationId,
  onUploadSuccess,
  maxFiles = 10,
  maxSizeMB = 10
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles = files.filter(f => {
      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        toast.error(`${f.name} exceeds ${maxSizeMB}MB limit`);
        return false;
      }
      return true;
    });

    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        await safetyObservationApi.uploadAttachment(observationId, file, 'before');
      }
      toast.success(`${selectedFiles.length} file(s) uploaded`);
      setSelectedFiles([]);
      onUploadSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, PDF (max {maxSizeMB}MB each, {maxFiles} files max)
          </p>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-accent p-2 rounded">
              <span className="text-sm truncate flex-1">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
