import React, { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'

interface AppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  loading?: boolean
  closeOnOutsideClick?: boolean
  className?: string
}

interface AppDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface AppDialogBodyProps {
  children: React.ReactNode
  className?: string
}

interface AppDialogFooterProps {
  children: React.ReactNode
  className?: string
}

interface AppDialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface AppDialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  fullscreen: 'max-w-[95vw] h-[95vh]'
}

export const AppDialog: React.FC<AppDialogProps> = React.memo(({
  open,
  onOpenChange,
  children,
  size = 'md',
  loading = false,
  closeOnOutsideClick = true,
  className = ''
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const handleClose = useCallback(() => {
    if (!loading) {
      onOpenChange(false)
    }
  }, [loading, onOpenChange])

  // Body scroll lock
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'

      setTimeout(() => {
        const firstFocusable = dialogRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement
        firstFocusable?.focus()
      }, 100)

      return () => {
        document.body.style.overflow = ''
        previousFocusRef.current?.focus()
      }
    }
  }, [open])

  // ESC key handler
  useEffect(() => {
    if (!open || loading) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, loading, handleClose])

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return

    const focusableElements = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusableElements?.length) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }, [])

  if (!open) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOutsideClick && !loading ? handleClose : undefined}
      />

      {/* Dialog Container */}
      <div
        ref={dialogRef}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-popover text-popover-foreground border border-border
          rounded-2xl
          shadow-2xl
          animate-in zoom-in-95 duration-200
          ${className}
        `}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
})

AppDialog.displayName = 'AppDialog'

export const AppDialogHeader: React.FC<AppDialogHeaderProps> = ({ children, className = '' }) => (
  <div className={`flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 ${className}`} style={{ flexShrink: 0 }}>
    {children}
  </div>
)

export const AppDialogBody: React.FC<AppDialogBodyProps> = ({ children, className = '' }) => (
  <div className={`overflow-y-auto p-6 ${className}`} style={{ flex: 1, minHeight: 0 }}>
    {children}
  </div>
)

export const AppDialogFooter: React.FC<AppDialogFooterProps> = ({ children, className = '' }) => (
  <div className={`flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 ${className}`} style={{ flexShrink: 0 }}>
    {children}
  </div>
)

export const AppDialogTitle: React.FC<AppDialogTitleProps> = ({ children, className = '' }) => (
  <h2 className={`text-xl font-semibold text-gray-900 dark:text-white ${className}`}>
    {children}
  </h2>
)

export const AppDialogDescription: React.FC<AppDialogDescriptionProps> = ({ children, className = '' }) => (
  <p className={`mt-1 text-sm text-gray-600 dark:text-gray-400 ${className}`}>
    {children}
  </p>
)

interface AppDialogCloseButtonProps {
  onClose: () => void
  disabled?: boolean
}

export const AppDialogCloseButton: React.FC<AppDialogCloseButtonProps> = ({ onClose, disabled }) => (
  <button
    onClick={onClose}
    disabled={disabled}
    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="Close dialog"
  >
    <X className="w-5 h-5" />
  </button>
)

// Convenience wrapper for common modal pattern
interface SimpleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  loading?: boolean
  primaryAction?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  closeOnOutsideClick?: boolean
}

export const SimpleDialog: React.FC<SimpleDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  loading = false,
  primaryAction,
  secondaryAction,
  closeOnOutsideClick = true
}) => {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={size}
      loading={loading}
      closeOnOutsideClick={closeOnOutsideClick}
    >
      <AppDialogHeader>
        <div className="flex-1">
          <AppDialogTitle>{title}</AppDialogTitle>
          {description && <AppDialogDescription>{description}</AppDialogDescription>}
        </div>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} disabled={loading} />
      </AppDialogHeader>

      <AppDialogBody>{children}</AppDialogBody>

      {(primaryAction || secondaryAction) && (
        <AppDialogFooter>
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              disabled={loading}
            >
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'primary'}
              onClick={primaryAction.onClick}
              disabled={loading}
            >
              {loading ? 'Loading...' : primaryAction.label}
            </Button>
          )}
        </AppDialogFooter>
      )}
    </AppDialog>
  )
}
