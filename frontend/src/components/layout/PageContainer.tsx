import React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  size?: 'default' | 'wide' | 'full'
  className?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  size = 'default',
  className
}) => {
  const sizeClasses = {
    default: 'max-w-[1600px] mx-auto px-6 py-6',
    wide: 'max-w-[1800px] mx-auto px-6 py-6',
    full: 'max-w-none px-0 py-0'
  }

  return (
    <div className={cn('w-full', sizeClasses[size], className)}>
      {children}
    </div>
  )
}
