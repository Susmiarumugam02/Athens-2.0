import { ReactNode } from 'react';
import { Row } from 'antd';

interface ModuleFilterBarProps {
  children: ReactNode;
}

export function ModuleFilterBar({ children }: ModuleFilterBarProps) {
  return (
    <div style={{ 
      marginBottom: 16, 
      padding: '16px', 
      backgroundColor: '#fff', 
      borderRadius: '8px' 
    }}>
      <Row gutter={16}>
        {children}
      </Row>
    </div>
  );
}
