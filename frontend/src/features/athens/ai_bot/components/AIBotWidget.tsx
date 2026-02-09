import React, { useState } from 'react';
import { FloatButton, Badge } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import AIBotChat from './AIBotChat';

const AIBotWidget: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
    setHasNewMessages(false);
  };

  return (
    <>
      <FloatButton
        icon={<RobotOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        onClick={handleChatToggle}
        badge={hasNewMessages ? { dot: true } : undefined}
      />
      
      <AIBotChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
};

export default AIBotWidget;
