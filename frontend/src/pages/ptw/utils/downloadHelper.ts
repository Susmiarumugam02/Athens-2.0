/**
 * Download Helper Utility
 * Handles file downloads from blob responses
 */

export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getFilenameFromResponse = (response: any, defaultFilename: string): string => {
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1];
    }
  }
  return defaultFilename;
};
