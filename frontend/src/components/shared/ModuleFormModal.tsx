import { Modal, ModalProps } from 'antd';
import { ReactNode } from 'react';

interface ModuleFormModalProps extends ModalProps {
  children: ReactNode;
}

export function ModuleFormModal({ 
  children, 
  ...props 
}: ModuleFormModalProps) {
  return (
    <Modal
      {...props}
      destroyOnClose
      centered
    >
      {children}
    </Modal>
  );
}
