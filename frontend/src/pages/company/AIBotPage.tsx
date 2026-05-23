import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Tag, Spin, Divider, Typography, Space } from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined,
  BulbOutlined, ClearOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../lib/api';

const { Text, Title } = Typography;

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
  time: string;
}

const QUICK_SUGGESTIONS = [
  'What is a PTW?',
  'Hot work safety requirements',
  'Confined space entry procedure',
  'Electrical LOTO procedure',
  'Working at height safety',
  'PPE selection guide',
  'How to report an incident',
  'Risk assessment levels',
];

// Local fallback knowledge base — mirrors backend simple_urls.py
const LOCAL_KB: Record<string, string> = {
  ptw: 'A Permit to Work (PTW) is a formal written system to control hazardous work. Steps: 1) Identify hazards, 2) Assess risks, 3) Implement controls, 4) Get authorization, 5) Monitor work, 6) Close out permit.',
  'hot work': 'Hot work safety: fire watch for 30 min after work, remove combustibles within 35ft, have fire extinguisher ready, check for flammable vapors, obtain hot work permit.',
  'confined space': 'Confined space entry: atmospheric testing (O2, LEL, H2S, CO), continuous monitoring, mechanical ventilation, entry supervisor, rescue team on standby, communication system.',
  electrical: 'Electrical safety: use LOTO procedures, verify isolation before work, use insulated tools, wear appropriate PPE, only qualified electricians perform electrical work.',
  height: 'Working at height: use fall protection harness, install guardrails, establish exclusion zones below, inspect equipment, check weather, have rescue plan.',
  ppe: 'PPE selection: safety helmet, shoes, gloves, goggles, high-vis vest. For specific hazards: respirator (chemical), harness (height), arc flash suit (electrical), chemical suit (hazardous substances).',
  incident: 'Incident reporting: report ALL incidents immediately. Steps: 1) Ensure safety, 2) Notify supervisor, 3) Preserve scene, 4) Complete report within 24h, 5) Investigate root cause, 6) Implement corrective actions.',
  risk: 'Risk = Probability × Severity. Levels: Low (1-4), Medium (5-9), High (10-16), Extreme (17-25). Control hierarchy: Eliminate → Substitute → Engineering → Administrative → PPE.',
  loto: 'LOTO procedure: 1) Notify employees, 2) Identify energy sources, 3) Shut down equipment, 4) Isolate energy, 5) Apply locks/tags, 6) Release stored energy, 7) Verify isolation.',
  excavation: 'Excavation safety: locate underground utilities, assess soil, install shoring/sloping, provide safe entry/exit, assign competent person, inspect daily.',
  chemical: 'Chemical handling: read SDS before use, use appropriate PPE, ensure ventilation, have spill kit, store properly, never mix incompatible chemicals.',
  fire: 'Fire safety: know evacuation route, locate fire extinguisher, use PASS (Pull, Aim, Squeeze, Sweep), never use elevators during fire, report all fire hazards.',
};

function localAnswer(question: string): string {
  const q = question.toLowerCase();
  if (['hello', 'hi', 'hey'].some(g => q.includes(g))) {
    return 'Hello! I can help with PTW, hot work, confined space, electrical safety, height work, PPE, incident reporting, risk assessment, LOTO, excavation, chemical handling, and fire safety.';
  }
  for (const [key, answer] of Object.entries(LOCAL_KB)) {
    if (q.includes(key)) return answer;
  }
  return 'I can help with: PTW, hot work, confined space, electrical safety, working at height, PPE, incident reporting, risk assessment, LOTO, excavation, chemical handling, and fire safety. Please try rephrasing your question.';
}

const AIBotPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'bot',
      text: "Hello! I'm your EHS AI Assistant. I can help you with PTW procedures, safety requirements, risk assessment, incident reporting, and more.\n\nAsk me anything about workplace safety!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(QUICK_SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load suggestions from backend
  useEffect(() => {
    apiClient.get('/api/ai/suggestions/')
      .then(r => { if (r.data.suggestions?.length) setSuggestions(r.data.suggestions); })
      .catch(() => {});
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      text: msg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post('/api/ai/chat/', { message: msg });
      const reply = res.data?.reply || res.data?.message || 'No response received.';
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err: any) {
      // Fallback: answer locally using keyword matching
      const fallback = localAnswer(msg);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: fallback,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'bot',
      text: "Chat cleared. How can I help you with EHS today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <RobotOutlined style={{ marginRight: 10, color: '#1890ff' }} />
            EHS AI Assistant
          </Title>
          <Text type="secondary">Ask me anything about workplace safety, PTW, and EHS procedures</Text>
        </div>
        <Button icon={<ClearOutlined />} onClick={clearChat} type="text">Clear</Button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', background: '#f5f5f5',
        borderRadius: 12, padding: 16, marginBottom: 12,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            {msg.role === 'bot' && (
              <Avatar
                icon={<RobotOutlined />}
                style={{ background: '#1890ff', flexShrink: 0 }}
                size={32}
              />
            )}
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#1890ff' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#222',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              fontSize: 14,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}>
              {msg.text}
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                {msg.time}
              </div>
            </div>
            {msg.role === 'user' && (
              <Avatar
                icon={<UserOutlined />}
                style={{ background: '#52c41a', flexShrink: 0 }}
                size={32}
              />
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Avatar icon={<RobotOutlined />} style={{ background: '#1890ff' }} size={32} />
            <div style={{ background: '#fff', padding: '10px 16px', borderRadius: '16px 16px 16px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>Thinking...</Text>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 2 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <BulbOutlined style={{ color: '#faad14' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Quick questions:</Text>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.slice(0, 6).map(s => (
              <Tag
                key={s}
                style={{ cursor: 'pointer', borderRadius: 12, padding: '2px 10px' }}
                color="blue"
                onClick={() => sendMessage(s)}
              >
                {s}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={() => sendMessage()}
          placeholder="Ask about PTW, safety procedures, risk assessment..."
          disabled={loading}
          style={{ borderRadius: '20px 0 0 20px', fontSize: 14 }}
          size="large"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          size="large"
          style={{ borderRadius: '0 20px 20px 0' }}
        >
          Send
        </Button>
      </Space.Compact>
    </div>
  );
};

export default AIBotPage;
