import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface KPICardProps {
  label: string
  value: string | number
  icon: LucideIcon
  variant?: 'primary' | 'success' | 'warning' | 'purple'
  className?: string
}

const variantStyles = {
  primary: 'from-primary/90 to-primary',
  success: 'from-emerald-500/90 to-emerald-600',
  warning: 'from-amber-500/90 to-amber-600',
  purple: 'from-purple-500/90 to-purple-600',
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon: Icon,
  variant = 'primary',
  className,
}) => {
  return (
    <div className={cn(
      'relative rounded-2xl bg-gradient-to-br shadow-xl overflow-hidden',
      variantStyles[variant],
      className
    )}>
      {/* Inner glow overlay */}
      <div className="absolute inset-0 bg-white/10 rounded-2xl" />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-foreground/80">{label}</p>
            <p className="text-3xl font-bold text-primary-foreground mt-2">{value}</p>
          </div>
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur">
            <Icon className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}
