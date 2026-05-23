// Utility helpers for phone input sanitization and keyboard/paste handling
export function sanitizePhoneInput(value: string, maxDigits = 10) {
  if (!value) return ''
  // Remove all non-digit characters
  const digits = value.replace(/\D+/g, '')
  // Trim leading zeros only if desired; preserve digits order
  return digits.slice(0, maxDigits)
}

export function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  // Allow control/navigation keys
  const allowed = [
    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'
  ]
  if (allowed.includes(e.key)) return

  // Allow digits only
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault()
  }
}

export function handlePhonePaste(e: React.ClipboardEvent<HTMLInputElement>, maxDigits = 10) {
  const text = e.clipboardData.getData('text') || ''
  const cleaned = sanitizePhoneInput(text, maxDigits)
  if (cleaned.length === 0) {
    // Prevent pasting non-digit content
    e.preventDefault()
    return
  }
  // replace pasted content with cleaned digits
  e.preventDefault()
  const target = e.target as HTMLInputElement
  const cur = target.value || ''
  const selStart = target.selectionStart ?? cur.length
  const selEnd = target.selectionEnd ?? cur.length
  const next = (cur.slice(0, selStart) + cleaned + cur.slice(selEnd)).replace(/\D+/g, '').slice(0, maxDigits)
  target.value = next
  const ev = new Event('input', { bubbles: true })
  target.dispatchEvent(ev)
}
