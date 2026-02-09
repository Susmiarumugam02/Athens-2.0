import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  isLoading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title}>
      {description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Please wait...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
