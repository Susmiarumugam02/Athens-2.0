import React from 'react';
import { App, Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';

interface PTWPrintPreviewProps {
  permitId?: number;
}

const PTWPrintPreview: React.FC<PTWPrintPreviewProps> = ({ permitId }) => {
  const { message } = App.useApp();

  return (
    <Button
      icon={<PrinterOutlined />}
      onClick={() => {
        if (!permitId) {
          message.warning('Save the permit to preview');
          return;
        }
        window.open(`/dashboard/ptw/print/${permitId}`, '_blank');
      }}
    >
      Print Preview
    </Button>
  );
};

export default PTWPrintPreview;
