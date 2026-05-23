import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Input, Spin, Tooltip } from 'antd'
import { RobotOutlined, SendOutlined, CloseOutlined, MinusOutlined, ClearOutlined } from '@ant-design/icons'
import { sendChatMessage, clearChatHistory } from '../../services/aiService'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function detectModule(pathname: string): string {
  if (pathname.includes('/ptw')) return 'ptw'
  if (pathname.includes('/incident')) return 'incident'
  if (pathname.includes('/inspection')) return 'inspection'
  if (pathname.includes('/safety-observation')) return 'safety_observation'
  if (pathname.includes('/training')) return 'training'
  if (pathname.includes('/workforce')) return 'workforce'
  if (pathname.includes('/ergon')) return 'ergon'
  if (pathname.includes('/tbt')) return 'tbt'
  if (pathname.includes('/mom')) return 'mom'
  return 'general'
}

const MODULE_LABELS: Record<string, string> = {
  ptw: 'PTW Assistant', incident: 'Incident Assistant',
  inspection: 'Inspection Assistant', safety_observation: 'Safety Assistant',
  training: 'Training Assistant', general: 'Athens AI',
  workforce: 'Workforce Assistant', ergon: 'ERGON Assistant',
  tbt: 'TBT Assistant', mom: 'MoM Assistant',
}

const SUGGESTIONS: Record<string, string[]> = {
  ptw: ['What PPE is needed for hot work?', 'How to fill a confined space permit?', 'What are LOTO requirements?'],
  incident: ['How to investigate a near miss?', 'What are immediate response steps?', 'When to report to regulator?'],
  inspection: ['Generate checklist for electrical area', 'Common inspection findings?', 'How often to inspect scaffolding?'],
  general: ['What is a PTW?', 'Explain risk matrix', 'What PPE for welding?'],
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6,
  color: '#fff', cursor: 'pointer', padding: '3px 6px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const AthensAIAssistant: React.FC = () => {
  const location = useLocation()
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const module = detectModule(location.pathname)
  const title = MODULE_LABELS[module] || 'Athens AI'
  const suggestions = SUGGESTIONS[module] || SUGGESTIONS.general

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm Athens AI. I'm in ${title} mode. How can I help you?`,
      }])
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await sendChatMessage(msg, {
        module,
        project: (user as any)?.project_id ? String((user as any).project_id) : '',
        conversation_id: conversationId,
      })
      setConversationId(res.conversation_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [loading, module, conversationId, user])

  const handleClear = async () => {
    if (conversationId) await clearChatHistory(conversationId).catch(() => {})
    setMessages([])
    setConversationId(undefined)
  }

  if (!open) {
    return (
      <Tooltip title="Athens AI Assistant" placement="left">
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(24,144,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RobotOutlined style={{ color: '#fff', fontSize: 22 }} />
        </button>
      </Tooltip>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      width: 360, borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      background: '#fff', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      maxHeight: minimized ? 52 : 520,
      transition: 'max-height 0.25s ease',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <RobotOutlined style={{ color: '#40a9ff', fontSize: 18 }} />
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, flex: 1 }}>{title}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title="Clear chat">
            <button onClick={handleClear} style={btnStyle}><ClearOutlined style={{ fontSize: 12 }} /></button>
          </Tooltip>
          <Tooltip title={minimized ? 'Expand' : 'Minimize'}>
            <button onClick={() => setMinimized(v => !v)} style={btnStyle}><MinusOutlined style={{ fontSize: 12 }} /></button>
          </Tooltip>
          <Tooltip title="Close">
            <button onClick={() => setOpen(false)} style={btnStyle}><CloseOutlined style={{ fontSize: 12 }} /></button>
          </Tooltip>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user' ? '#1890ff' : '#f5f5f5',
                  color: msg.role === 'user' ? '#fff' : '#222',
                  fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '12px 12px 12px 4px' }}>
                  <Spin size="small" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 12,
                  border: '1px solid #d9d9d9', background: '#fafafa',
                  cursor: 'pointer', color: '#555',
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Ask Athens AI..."
              style={{ borderRadius: 20, fontSize: 13 }}
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              style={{ borderRadius: 20, flexShrink: 0 }}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default AthensAIAssistant
