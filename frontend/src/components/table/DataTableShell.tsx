import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface DataTableShellProps {
  title: string;
  subtitle?: string;
  count?: number | string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function DataTableShell({
  title,
  subtitle,
  count,
  actions,
  toolbar,
  children,
  pagination,
  emptyState,
  className = '',
}: DataTableShellProps) {
  return (
    <Card className={className}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {count !== undefined && (
            <Badge variant="default" className="ml-2">
              {count}
            </Badge>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Toolbar */}
      {toolbar && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {toolbar}
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        {emptyState || children}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          {pagination}
        </div>
      )}
    </Card>
  );
}
