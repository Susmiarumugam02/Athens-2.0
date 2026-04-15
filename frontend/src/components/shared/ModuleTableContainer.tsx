import { Table } from 'antd';
import type { TableProps } from 'antd';
import './ModuleTableContainer.css';

interface ModuleTableContainerProps<T> extends TableProps<T> {
  highlightRowCondition?: (record: T) => boolean;
}

export function ModuleTableContainer<T extends object>({
  highlightRowCondition,
  rowClassName,
  size = 'middle',
  ...props
}: ModuleTableContainerProps<T>) {
  return (
    <div className="module-table-container">
      <Table
        {...props}
        size={size}
        rowClassName={(record, index) => {
          const customClass = typeof rowClassName === 'function' 
            ? rowClassName(record, index) 
            : rowClassName || '';
          const highlightClass = highlightRowCondition?.(record) 
            ? 'row-highlighted' 
            : '';
          return `${customClass} ${highlightClass}`.trim();
        }}
      />
    </div>
  );
}
