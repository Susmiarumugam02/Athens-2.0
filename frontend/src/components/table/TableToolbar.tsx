import type { ReactNode } from 'react';

interface TableToolbarProps {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function TableToolbar({ left, middle, right, className = '' }: TableToolbarProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 ${className}`}>
      {left && <div className="flex-1 w-full sm:w-auto">{left}</div>}
      {middle && <div className="flex items-center gap-2">{middle}</div>}
      {right && <div className="flex items-center gap-2 ml-auto">{right}</div>}
    </div>
  );
}
