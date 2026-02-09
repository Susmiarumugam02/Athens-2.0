import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar, Spin, message, Tooltip, Badge } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, CloseOutlined, SearchOutlined, BulbOutlined } from '@ant-design/icons';
import { aiBotService } from '../services/aiBotService';
import './AIBotChat.css';

const { Search } = Input;

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'stats' | 'search' | 'error' | 'actions';
}

interface AIBotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIBotChat: React.FC<AIBotChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, sender: 'user' | 'bot', type?: Message['type']) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      type,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    addMessage(userMessage, 'user');
    setInputText('');
    setIsLoading(true);

    try {
      const response = await aiBotService.queryRAG(userMessage);

      if (response.success) {
        const botResponse = formatResponse(response.data);
        addMessage(botResponse, 'bot');
      } else {
        addMessage('Sorry, I encountered an error processing your request.', 'bot', 'error');
      }
    } catch (error) {
      addMessage('Sorry, I encountered an error. Please try again.', 'bot', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatResponse = (data: any): string => {
    if (typeof data === 'string') return data;
    
    // Handle enhanced AI response
    if (data.type === 'enhanced_ai_response') {
      return data.answer || 'Enhanced AI response received.';
    }
    
    if (data.type) {
      switch (data.type) {
        case 'safety_high_priority':
          return `🚨 **${data.message}**

📊 **Details:**
- High Severity Items: ${data.data?.total_high_severity || 0}

${data.data?.items?.length > 0 ? 
            `🔍 **Recent High-Severity Items:**
${data.data.items.map((item: any) => 
              `• ${item.title} (${item.severity}) - ${item.status}`
            ).join('\n')}` : ''}

💡 **Next Steps:**
${data.suggestions?.map((s: string) => `${s}`).join('\n') || ''}`;
        
        case 'incident_open':
          return `🚨 **${data.message}**

${data.data?.items?.length > 0 ? 
            `📋 **Open Incidents:**
${data.data.items.map((item: any) => 
              `• ${item.title} - $${item.cost || 0} (${item.date})`
            ).join('\n')}` : ''}

💡 **Recommended Actions:**
${data.suggestions?.map((s: string) => `${s}`).join('\n') || ''}`;
        
        case 'ptw_pending':
          return `⏳ **${data.message}**

${data.data?.items?.length > 0 ? 
            `📋 **Pending Permits:**
${data.data.items.map((item: any) => 
              `• ${item.number}: ${item.description.substring(0, 50)}... (${item.date})`
            ).join('\n')}` : ''}

💡 **Action Items:**
${data.suggestions?.map((s: string) => `${s}`).join('\n') || ''}`;
        
        case 'search_results':
          const results = data.data?.results || [];
          const moduleBreakdown = data.data?.module_breakdown || {};
          
          return `🔍 **${data.message}**

${Object.keys(moduleBreakdown).length > 0 ? 
            `📊 **Found in modules:**
${Object.entries(moduleBreakdown).map(([module, count]) => 
              `• ${module.charAt(0).toUpperCase() + module.slice(1)}: ${count} items`
            ).join('\n')}\n\n` : ''}📄 **Results:**
${results.length > 0 ? 
            results.map((item: any) => {
              const moduleIcon: Record<string, string> = {
                'safety': '🛡️',
                'incident': '🚨',
                'ptw': '📋',
                'worker': '👥',
                'training': '📚',
                'toolbox': '🛠️',
                'mom': '📝',
                'chat': '💬',
                'attendance': '📅',
                'user': '👤',
                'project': '🏢'
              };
              const icon = moduleIcon[item.module] || '📄';
              
              return `${icon} **${item.title}** (${item.type})
   📝 ${item.description?.substring(0, 80)}${item.description?.length > 80 ? '...' : ''}
   📊 Status: ${item.status || 'N/A'} | 📅 ${item.date}
   ${item.department ? `🏢 ${item.department}` : ''} ${item.location ? `📍 ${item.location}` : ''}`;
            }).join('\n\n') : 'No results found.'}

💡 **Suggestions:**
${data.suggestions?.map((s: string) => `${s}`).join('\n') || ''}`;
        
        case 'comprehensive_dashboard':
          const stats = data.data || {};
          return `📊 **${data.message}**

${Object.entries(stats).map(([module, moduleStats]: [string, any]) => {
            const moduleIcon = {
              'safety': '🛡️',
              'incidents': '🚨',
              'ptw': '📋',
              'workers': '👥',
              'meetings': '📝'
            }[module] || '📄';

            return `${moduleIcon} **${module.charAt(0).toUpperCase() + module.slice(1)}:**
${Object.entries(moduleStats).map(([key, value]) =>
              `   • ${key.replace('_', ' ')}: ${value}`
            ).join('\n')}`;
          }).join('\n\n')}

💡 **What you can search for:**
${data.suggestions?.map((s: string) => `${s}`).join('\n') || ''}`;

        case 'universal_search_results':
        case 'manpower_intelligence':
          return data.answer || 'Search completed.';

        case 'no_results':
          return data.answer || 'No results found for your search.';

        case 'rag_results':
          const sources = data.sources || [];
          return `🤖 **Answer:**\n${data.answer}\n\n📚 **Sources (${sources.length}):**\n${sources.map((s: any) => `• [${s.module} #${s.id}] ${s.title || ''}\n  ${s.snippet}`).join('\n')}`;

        case 'rag_no_results':
          const missing = (data.missing_fields || []).join(', ');
          return `ℹ️ Information not available in current database. ${missing ? `Missing fields in schema: ${missing}` : ''}`;

        case 'intelligent_no_results':
          const intentAnalysis = data.intent_analysis || {};
          return `🤔 **${data.message}**

🎯 **What I understood:**
• Domain: ${intentAnalysis.understood_domain || 'general'}
• Confidence: ${Math.round((intentAnalysis.confidence || 0) * 100)}%
• Action: ${intentAnalysis.action_type || 'search'}

💡 **Try these suggestions:**
${data.suggestions?.map((s: string) => `• ${s}`).join('\n') || ''}

${data.alternative_queries?.length > 0 ? 
            `🔄 **Alternative approaches:**
${data.alternative_queries.map((alt: string) => `• ${alt}`).join('\n')}` : ''}`;
        
        case 'intelligent_results':
          const intelligentResults = data.data?.results || [];
          const analytics = data.analytics || {};
          const intent = data.intent_analysis || {};
          
          return `🎯 **${data.message}**

🧠 **AI Understanding:**
• Domain: ${intent.understood_domain} (${Math.round((intent.confidence || 0) * 100)}% confidence)
• Found: ${intent.semantic_matches?.length || 0} semantic matches

${Object.keys(analytics).length > 0 ? 
            `📊 **Analytics:**
• Total Workers: ${analytics.total_workers || 0}
• Average Hours: ${analytics.average_hours || 0}
• Total Overtime: ${analytics.total_overtime || 0}

` : ''}📄 **Results:**
${intelligentResults.length > 0 ? 
            intelligentResults.map((item: any) => {
              const moduleIcon: Record<string, string> = {
                'manpower': '👥',
                'safety': '🛡️',
                'incident': '🚨',
                'permit': '📋'
              };
              const icon = moduleIcon[item.module] || '📄';
              
              return `${icon} **${item.title}**
   📝 ${item.description}
   📅 ${item.date} | ${item.status ? `📊 ${item.status}` : ''}
   ${item.category ? `🏢 ${item.category}` : ''} ${item.count ? `🔢 ${item.count}` : ''}`;
            }).join('\n\n') : 'No specific results found.'}

💡 **Smart Suggestions:**
${data.suggestions?.map((s: string) => `• ${s}`).join('\n') || ''}`;
        

        
        case 'error':
          return `⚠️ ${data.message}

💡 **Try:**
${data.suggestions?.map((s: string) => `${s}`).join('\n') || ''}`;
        
        default:
          return data.message || 'I\'m here to help! I understand context and can provide intelligent suggestions.';
      }
    }
    
    return JSON.stringify(data, null, 2);
  };

  const handleQuickAction = async (action: string) => {
    setIsLoading(true);
    try {
      let query = '';
      
      switch (action) {
        case 'dashboard':
          query = 'show me complete dashboard overview with all statistics';
          break;
        case 'safety_high':
          query = 'show high severity safety observations that need immediate attention';
          break;
        case 'incidents_open':
          query = 'show all open incidents that require action';
          break;
        case 'ptw_pending':
          query = 'show all pending permits waiting for approval';
          break;
        case 'ptw_active':
          query = 'show all active approved permits';
          break;
        case 'alerts':
          query = 'show system alerts and high priority items';
          break;
        default:
          query = action;
      }
      
      // Add user message first
      addMessage(query, 'user');
      
      const response = await aiBotService.queryRAG(query);

      if (response.success) {
        const botResponse = formatResponse(response.data);
        addMessage(botResponse, 'bot');
      } else {
        addMessage('Sorry, I encountered an error processing your request.', 'bot', 'error');
      }
    } catch (error) {
      addMessage('I\'m having trouble connecting right now. Please try again in a moment.', 'bot', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: '📊 Dashboard', action: 'dashboard' },
    { label: '🚨 Safety', action: 'safety_high' },
    { label: '🔥 Incidents', action: 'incidents_open' },
    { label: '⏳ Permits', action: 'ptw_pending' },
    { label: '✅ Active', action: 'ptw_active' },
    { label: '📈 Alerts', action: 'alerts' },
  ];

  if (!isOpen) return null;

  return (
    <div className="modern-ai-chat-container">
      <div className="modern-ai-chat">
        {/* Header */}
        <div className="chat-header">
          <div className="header-left">
            <div className="ai-avatar">
              <RobotOutlined />
            </div>
            <div className="header-info">
              <h3>AI Assistant</h3>
              <span className="status">Online • Ready to help</span>
            </div>
          </div>
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={onClose}
            className="close-btn"
          />
        </div>

        {/* Messages Area */}
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-avatar">
                <RobotOutlined />
              </div>
              <h4>👋 Hi! I'm your AI Assistant</h4>
              <p>I can help you with safety observations, incidents, permits, and more. Try asking me something!</p>
              <div className="suggested-queries">
                <div className="suggestion-chip" onClick={() => handleQuickAction('dashboard')}>📊 Dashboard Overview</div>
                <div className="suggestion-chip" onClick={() => handleQuickAction('safety_high')}>🚨 Safety Issues</div>
                <div className="suggestion-chip" onClick={() => handleQuickAction('incidents_open')}>🔥 Open Incidents</div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`message-wrapper ${message.sender}`}>
              <div className="message-bubble">
                {message.sender === 'bot' && (
                  <Avatar className="message-avatar" icon={<RobotOutlined />} size={32} />
                )}
                <div className="message-content">
                  <div className="message-text">
                    {message.text}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {message.sender === 'user' && (
                  <Avatar className="message-avatar" icon={<UserOutlined />} size={32} />
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message-wrapper bot">
              <div className="message-bubble">
                <Avatar className="message-avatar" icon={<RobotOutlined />} size={32} />
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length > 0 && (
          <div className="quick-actions-bar">
            {quickActions.slice(0, 4).map((action) => (
              <Tooltip key={action.action} title={action.label}>
                <Button
                  size="small"
                  type="text"
                  onClick={() => handleQuickAction(action.action)}
                  disabled={isLoading}
                  className="quick-action-btn"
                >
                  {action.label.split(' ')[0]}
                </Button>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <Search
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onSearch={handleSendMessage}
              placeholder="Ask me anything about your project..."
              enterButton={
                <Button 
                  type="primary" 
                  icon={<SendOutlined />} 
                  loading={isLoading}
                  disabled={!inputText.trim()}
                  className="send-btn"
                />
              }
              size="large"
              disabled={isLoading}
              className="modern-search-input"
            />
          </div>
          <div className="input-suggestions">
            <BulbOutlined /> Try: "manpower today", "total workers", "safety", "incidents", "permits", "search any keyword"
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBotChat;
