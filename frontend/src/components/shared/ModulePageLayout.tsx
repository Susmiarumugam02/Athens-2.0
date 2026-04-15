import { ReactNode } from 'react';
import { Breadcrumb, Space } from 'antd';

interface ModulePageLayoutProps {
  children: ReactNode;
  breadcrumbs?: { title: string }[];
  actions?: ReactNode;
}

export function ModulePageLayout({ 
  children, 
  breadcrumbs, 
  actions 
}: ModulePageLayoutProps) {
  return (
    <div style={{ padding: '24px' }}>
      {breadcrumbs && (
        <Breadcrumb 
          style={{ marginBottom: '16px' }} 
          items={breadcrumbs} 
        />
      )}
      
      {actions && (
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {actions}
        </div>
      )}
      
      {children}
    </div>
  );
}
