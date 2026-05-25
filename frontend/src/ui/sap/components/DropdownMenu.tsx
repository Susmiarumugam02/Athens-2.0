import React, { useState, useRef, useEffect, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'

const DropdownContext = createContext<{
  closeDropdown: () => void
} | null>(null)

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'default' | 'danger'
  disabled?: boolean
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const closeDropdown = () => setIsOpen(false)
  const calculatePosition = () => {
    if (!triggerRef.current) return position

    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 220
    const menuHeight = 250
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    const padding = 16

    let top = rect.bottom + scrollY + 8
    let left = align === 'right'
      ? rect.right + scrollX - menuWidth
      : rect.left + scrollX

    if (left + menuWidth > viewportWidth + scrollX - padding) {
      left = rect.right + scrollX - menuWidth
    }
    if (left < scrollX + padding) {
      left = scrollX + padding
    }

    const spaceBelow = viewportHeight + scrollY - rect.bottom
    const spaceAbove = rect.top

    if (spaceBelow < menuHeight + padding && spaceAbove > menuHeight + padding) {
      top = rect.top + scrollY - menuHeight - 8
    } else if (spaceBelow < menuHeight + padding) {
      top = Math.max(scrollY + padding, viewportHeight + scrollY - menuHeight - padding)
    }

    return { top, left }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleScroll = () => {
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, align])

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isOpen) {
      setPosition(calculatePosition())
    }
    setIsOpen((open) => !open)
  }

  return (
    <>
      <div ref={triggerRef} onClick={handleTriggerClick} className="cursor-pointer inline-block">
        {trigger}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`theme-popover fixed min-w-[220px] max-w-[280px] rounded-xl py-2 ${className}`}
            style={{
              top: position.top,
              left: position.left,
              zIndex: 'var(--z-dropdown)'
            }}
          >
            <DropdownContext.Provider value={{ closeDropdown }}>
              {children}
            </DropdownContext.Provider>
          </div>,
          document.body
        )}
    </>
  )
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  className = '',
  variant = 'default',
  disabled = false
}) => {
  const context = useContext(DropdownContext)
  const baseClasses = 'w-full px-4 py-3 text-left text-sm transition-all duration-200 flex items-center gap-3 font-medium'
  const variantClasses = {
    default: 'theme-menu-item',
    danger: 'theme-menu-item-danger'
  }
  const disabledClasses = 'opacity-50 cursor-not-allowed'

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && onClick) {
      onClick()
      // Close dropdown after click
      context?.closeDropdown()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export const DropdownMenuSeparator: React.FC = () => (
  <div className="h-px bg-border my-2 mx-2" />
)
