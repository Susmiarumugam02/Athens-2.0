import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

interface TableEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function TableEmptyState({ title, description, action, icon }: TableEmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="flex justify-center mb-4">
        {icon || <FileText className="w-12 h-12 text-gray-400" />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
