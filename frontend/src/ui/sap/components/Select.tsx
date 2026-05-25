import React from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value?: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  children?: React.ReactNode;
}

const getPlaceholderFromChildren = (children: React.ReactNode): string | undefined => {
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;

    const props = child.props as { placeholder?: unknown; children?: React.ReactNode };

    if (child.type === SelectValue && typeof props.placeholder === 'string') {
      return props.placeholder;
    }

    const nested = getPlaceholderFromChildren(props.children);
    if (nested) return nested;
  }

  return undefined;
};

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  onValueChange,
  options,
  placeholder,
  className = '',
  children,
  ...props
}) => {
  const resolvedPlaceholder = placeholder ?? getPlaceholderFromChildren(children);
  const handleChange = (val: string) => {
    onChange?.(val);
    onValueChange?.(val);
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className={cn(
        'theme-control block w-full rounded-md px-3 py-2 shadow-sm',
        'focus:border-ring focus:ring-ring',
        className
      )}
      {...props}
    >
      {resolvedPlaceholder && <option value="" className="bg-popover text-muted-foreground">{resolvedPlaceholder}</option>}
      {options?.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled} className="bg-popover text-popover-foreground">
          {option.label}{option.disabled ? ' (Not Available)' : ''}
        </option>
      )) || []}
      {children}
    </select>
  );
};

export const SelectContent: React.FC<{ children: React.ReactNode; className?: string; position?: string }> = ({ children }) => <>{children}</>;
export const SelectItem: React.FC<React.OptionHTMLAttributes<HTMLOptionElement>> = ({ value, children, className, ...props }) => (
  <option value={value} className={cn('bg-popover text-popover-foreground', className)} {...props}>
    {children}
  </option>
);
export const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = () => null;
export const SelectValue: React.FC<{ placeholder?: string }> = () => null;
