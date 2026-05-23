import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Button, Avatar, Badge, Spin, Empty, Upload, Tooltip, Tag } from 'antd';
import {
  SendOutlined, PaperClipOutlined, SearchOutlined,
  UserOutlined, CheckOutlined, CheckCircleOutlined,
  TeamOutlined, BankOutlined, ToolOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import tokenManager from '../../lib/tokenManager';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatUser {
  id: number;
  username: string;
  name: string;
  email: string;
  admin_type: string;
  company_name: string;
  department: string;
  designation: string;
  photo: string | null;
  last_message: string | null;
  last_message_time: string | null;
  last_message_sender: number | null;
}

interface Message {
  id: number;
  sender: number;
  receiver: number;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  file?: string | null;
}

// EPC tab selection
type EpcTab = 'client' | 'contractor';

// ─── Role helpers ─────────────────────────────────────────────────────────────

const EPC_TYPES        = new Set(['epc', 'epcuser']);
const CLIENT_TYPES     = new Set(['client', 'clientuser', 'client_admin']);
const CONTRACTOR_TYPES = new Set(['contractor', 'contractoruser']);
const MASTERADMIN_TYPES = new Set(['masteradmin', 'master_admin']);

type CanonicalRole = 'epc' | 'client' | 'contractor' | 'master_admin' | 'unknown';

function normalizeRole(adminType?: string | null): CanonicalRole {
  if (!adminType) return 'unknown';
  const t = adminType.toLowerCase();
  if (EPC_TYPES.has(t))         return 'epc';
  if (CLIENT_TYPES.has(t))      return 'client';
  if (CONTRACTOR_TYPES.has(t))  return 'contractor';
  if (MASTERADMIN_TYPES.has(t)) return 'master_admin';
  return 'unknown';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  epc: 'blue', client: 'green', contractor: 'orange', master_admin: 'purple',
};

function getRoleColor(adminType?: string | null): string {
  return ROLE_COLOR[normalizeRole(adminType)] ?? 'default';
}

function getRoleLabel(adminType?: string | null): string {
  const role = normalizeRole(adminType);
  const labels: Record<CanonicalRole, string> = {
    epc: 'EPC', client: 'Client', contractor: 'Contractor',
    master_admin: 'Master Admin', unknown: adminType ?? '—',
  };
  return labels[role];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  return name.trim().split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface EpcTabBarProps {
  active: EpcTab;
  onChange: (tab: EpcTab) => void;
}

const EpcTabBar: React.FC<EpcTabBarProps> = ({ active, onChange }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
    {(['client', 'contractor'] as EpcTab[]).map(tab => {
      const isActive = active === tab;
      return (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderBottom: isActive ? '2px solid #1890ff' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: isActive ? 700 : 400,
            color: isActive ? '#1890ff' : '#666',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
        >
          {tab === 'client'
            ? <BankOutlined />
            : <ToolOutlined />}
          {tab === 'client' ? 'Client' : 'Contractor'}
        </button>
      );
    })}
  </div>
);

interface UserItemProps {
  u: ChatUser;
  isSelected: boolean;
  currentUserId: number;
  onClick: () => void;
}

const UserItem: React.FC<UserItemProps> = ({ u, isSelected, currentUserId, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', cursor: 'pointer',
      background: isSelected ? '#e6f4ff' : 'transparent',
      borderLeft: isSelected ? '3px solid #1890ff' : '3px solid transparent',
      transition: 'all 0.15s',
    }}
  >
    <Badge dot status="success" offset={[-2, 28]}>
      <Avatar src={u.photo ?? undefined} style={{ background: '#1890ff', flexShrink: 0 }} size={40}>
        {!u.photo && getInitials(u.name || u.username)}
      </Avatar>
    </Badge>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {u.name || u.username}
        </span>
        {u.last_message_time && (
          <span style={{ fontSize: 10, color: '#bbb', flexShrink: 0 }}>
            {formatTime(u.last_message_time)}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <Tag
          color={getRoleColor(u.admin_type)}
          style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', margin: 0 }}
        >
          {getRoleLabel(u.admin_type)}
        </Tag>
        {u.last_message && (
          <span style={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {Number(u.last_message_sender) === Number(currentUserId) ? 'You: ' : ''}{u.last_message}
          </span>
        )}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ChatboxPage: React.FC = () => {
  const user          = useAuthStore((state) => state.user);
  const currentUserId = (user as any)?.id as number;
  const myAdminType   = (user as any)?.admin_type as string | undefined;
  const myRole        = normalizeRole(myAdminType);
  const isEpc         = myRole === 'epc';
  const isReady       = myRole !== 'unknown';

  // EPC tab state — default to 'client'
  const [epcTab, setEpcTab]             = useState<EpcTab>('client');

  const [users, setUsers]               = useState<ChatUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [text, setText]                 = useState('');
  const [search, setSearch]             = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [sending, setSending]           = useState(false);
  const [sendError, setSendError]       = useState<string | null>(null);
  const [typing, setTyping]             = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── WebSocket helpers ──
  const buildWsUrl = useCallback((otherUserId: number): string => {
    const token = tokenManager.getAccessToken() ?? '';
    const base  = (import.meta.env.VITE_API_URL ?? '').replace(/^http/, 'ws');
    return `${base}/ws/chat/${otherUserId}/?token=${token}`;
  }, []);

  const closeWs = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;   // prevent reconnect on intentional close
      wsRef.current.close(1000);
      wsRef.current = null;
    }
  }, []);

  const openWs = useCallback((otherUser: ChatUser) => {
    closeWs();
    let ws: WebSocket;
    try {
      ws = new WebSocket(buildWsUrl(otherUser.id));
    } catch {
      // WebSocket not available (e.g. Channels not running) — REST fallback only
      return;
    }
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        // Normalise to the same shape the REST API returns
        setMessages(prev => {
          // Deduplicate by id (optimistic message has Date.now() id)
          const withoutOptimistic = prev.filter(
            m => !(m.id > 1_000_000_000_000 && m.content === msg.content && m.sender === msg.sender)
          );
          // Avoid true duplicates
          if (withoutOptimistic.some(m => m.id === msg.id)) return withoutOptimistic;
          return [...withoutOptimistic, msg];
        });
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = (evt) => {
      if (evt.code === 1000) return;
      reconnectRef.current = setTimeout(() => {
        if (wsRef.current === ws) openWs(otherUser);
      }, 3000);
    };
  }, [buildWsUrl, closeWs]);

  // Open / close WS when selected user changes
  useEffect(() => {
    if (!selectedUser) { closeWs(); return; }
    openWs(selectedUser);
    return closeWs;
  }, [selectedUser]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch contacts ──
  const fetchUsers = useCallback((tab: EpcTab) => {
    const adminType = (useAuthStore.getState().user as any)?.admin_type as string | undefined;
    if (!adminType) return;
    const role = normalizeRole(adminType);
    const url = role === 'epc' ? `/api/chatbox/users/?type=${tab}` : '/api/chatbox/users/';
    setLoadingUsers(true);
    setSelectedUser(null);
    setMessages([]);
    apiClient.get(url)
      .then(r => { setUsers(r.data); setFilteredUsers(r.data); })
      .catch(() => { setUsers([]); setFilteredUsers([]); })
      .finally(() => setLoadingUsers(false));
  }, []);

  // Fire when store is fully rehydrated and admin_type is known
  // isReady: false → true exactly once per session, triggering the first fetch
  // epcTab: changes when EPC user switches tabs
  useEffect(() => {
    if (!isReady) return;
    fetchUsers(epcTab);
  }, [isReady, epcTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search filter ──
  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredUsers(
      q ? users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.company_name?.toLowerCase().includes(q) ||
        u.admin_type?.toLowerCase().includes(q)
      ) : users
    );
  }, [search, users]);

  // ── Load message history (REST, once on contact select) ──
  const loadMessages = useCallback(async (userId: number) => {
    setLoadingMsgs(true);
    try {
      const r = await apiClient.get(`/api/chatbox/messages/?userId=${userId}`);
      const msgs: Message[] = (r.data.results ?? r.data).reverse();
      setMessages(msgs);
      const unread = msgs
        .filter(m => {
          const recvId = typeof m.receiver === 'object' && m.receiver !== null
            ? (m.receiver as any).id : m.receiver;
          return Number(recvId) === Number(currentUserId) && m.status !== 'read';
        })
        .map(m => m.id);
      if (unread.length) {
        apiClient.post('/api/chatbox/read-receipts/', { message_ids: unread }).catch(() => {});
      }
    } finally {
      setLoadingMsgs(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedUser) return;
    loadMessages(selectedUser.id);
  }, [selectedUser, loadMessages]);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message via WebSocket ──
  const sendMessage = async () => {
    if (!text.trim() || !selectedUser || sending) return;
    const ws = wsRef.current;
    const draft = text.trim();
    setText('');
    setSendError(null);

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Optimistic UI
      const optimistic: Message = {
        id: Date.now(), sender: currentUserId, receiver: selectedUser.id,
        content: draft, timestamp: new Date().toISOString(), status: 'sent',
      };
      setMessages(prev => [...prev, optimistic]);
      ws.send(JSON.stringify({
        message:     draft,
        sender_id:   currentUserId,
        receiver_id: selectedUser.id,
      }));
    } else {
      // WS not ready — fall back to REST
      setSending(true);
      const optimistic: Message = {
        id: Date.now(), sender: currentUserId, receiver: selectedUser.id,
        content: draft, timestamp: new Date().toISOString(), status: 'sent',
      };
      setMessages(prev => [...prev, optimistic]);
      try {
        await apiClient.post('/api/chatbox/messages/', { userId: selectedUser.id, content: draft });
        await loadMessages(selectedUser.id);
      } catch (err: any) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setSendError(err?.response?.data?.error ?? 'Failed to send message.');
      } finally {
        setSending(false);
      }
    }
  };

  // ── Typing indicator ──
  const handleTyping = (val: string) => {
    setText(val);
    setSendError(null);
    if (!selectedUser) return;
    if (!typing) {
      setTyping(true);
      apiClient.post('/api/chatbox/typing-indicator/', { other_user_id: selectedUser.id, is_typing: true }).catch(() => {});
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      apiClient.post('/api/chatbox/typing-indicator/', { other_user_id: selectedUser.id, is_typing: false }).catch(() => {});
    }, 1500);
  };

  // ── File upload ──
  const handleFileUpload = async (file: File) => {
    if (!selectedUser) return false;
    const fd = new FormData();
    fd.append('userId', String(selectedUser.id));
    fd.append('file', file);
    fd.append('content', '');
    try {
      await apiClient.post('/api/chatbox/messages/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadMessages(selectedUser.id);
    } catch {}
    return false;
  };

  // ── EPC tab change ──
  const handleEpcTabChange = (tab: EpcTab) => {
    setEpcTab(tab);
    setSearch('');
    setSelectedUser(null);
    setMessages([]);
  };

  // ─── Sidebar header label ─────────────────────────────────────────────────
  const sidebarTitle = () => {
    if (isEpc) return 'Team Chat';
    if (myRole === 'client')     return 'Chat with EPC';
    if (myRole === 'contractor') return 'Chat with EPC';
    return 'Team Chat';
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        <Spin /> <span style={{ marginLeft: 12 }}>Loading chat...</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 120px)',
      background: '#f5f5f5', borderRadius: 12,
      overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>

      {/* ── LEFT: Sidebar ── */}
      <div style={{ width: 300, background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 8px', borderBottom: isEpc ? 'none' : '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
            <TeamOutlined style={{ color: '#1890ff' }} />
            {sidebarTitle()}
          </div>
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="Search people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderRadius: 8 }}
          />
        </div>

        {/* EPC-only tab bar */}
        {isEpc && (
          <EpcTabBar active={epcTab} onChange={handleEpcTabChange} />
        )}

        {/* Role info banner for client / contractor */}
        {(myRole === 'client' || myRole === 'contractor') && (
          <div style={{
            margin: '8px 12px', padding: '6px 10px',
            background: '#f6ffed', border: '1px solid #b7eb8f',
            borderRadius: 6, fontSize: 11, color: '#52c41a',
          }}>
            Showing EPC contacts only
          </div>
        )}

        {/* User list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          ) : filteredUsers.length === 0 ? (
            <Empty
              description={
                isEpc
                  ? `No ${epcTab === 'client' ? 'Client' : 'Contractor'} users found`
                  : 'No EPC contacts found'
              }
              style={{ marginTop: 40 }}
            />
          ) : (
            filteredUsers.map(u => (
              <UserItem
                key={u.id}
                u={u}
                isSelected={selectedUser?.id === u.id}
                currentUserId={currentUserId}
                onClick={() => { setSelectedUser(u); setSendError(null); }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat window ── */}
      {!selectedUser ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#bbb' }}>
          <UserOutlined style={{ fontSize: 48 }} />
          <div style={{ fontSize: 16 }}>Select a contact to start chatting</div>
          {isEpc && (
            <div style={{ fontSize: 13, color: '#aaa' }}>
              Use the <strong>Client</strong> / <strong>Contractor</strong> tabs to switch contacts
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Chat header */}
          <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar src={selectedUser.photo ?? undefined} size={40} style={{ background: '#1890ff' }}>
              {!selectedUser.photo && getInitials(selectedUser.name || selectedUser.username)}
            </Avatar>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedUser.name || selectedUser.username}
                <Tag color={getRoleColor(selectedUser.admin_type)} style={{ fontSize: 11, margin: 0 }}>
                  {getRoleLabel(selectedUser.admin_type)}
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {selectedUser.designation || '—'} · {selectedUser.company_name || '—'}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loadingMsgs ? (
              <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
            ) : messages.length === 0 ? (
              <Empty description="No messages yet. Say hello!" style={{ marginTop: 60 }} />
            ) : (
              messages.map(msg => {
                // sender may be a nested object {id, email,...} from REST or a plain id from WS
                const senderId = typeof msg.sender === 'object' && msg.sender !== null
                  ? (msg.sender as any).id
                  : msg.sender;
                const isMine = Number(senderId) === Number(currentUserId);
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '65%', padding: '8px 14px',
                      borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMine ? '#1890ff' : '#fff',
                      color: isMine ? '#fff' : '#222',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      fontSize: 14,
                    }}>
                      {msg.file && (
                        <div style={{ marginBottom: msg.content ? 6 : 0 }}>
                          <a
                            href={`/api/chatbox/download/${msg.id}/`}
                            target="_blank" rel="noreferrer"
                            style={{ color: isMine ? '#fff' : '#1890ff', textDecoration: 'underline', fontSize: 12 }}
                          >
                            📎 Download attachment
                          </a>
                        </div>
                      )}
                      {msg.content && <div>{msg.content}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>{formatTime(msg.timestamp)}</span>
                        {isMine && (
                          <Tooltip title={msg.status}>
                            {msg.status === 'read'
                              ? <CheckCircleOutlined style={{ fontSize: 11, opacity: 0.8 }} />
                              : <CheckOutlined style={{ fontSize: 11, opacity: 0.6 }} />}
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send error banner */}
          {sendError && (
            <div style={{
              margin: '0 16px 4px', padding: '6px 12px',
              background: '#fff2f0', border: '1px solid #ffccc7',
              borderRadius: 6, fontSize: 12, color: '#ff4d4f',
            }}>
              {sendError}
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Upload beforeUpload={handleFileUpload} showUploadList={false}>
              <Tooltip title="Attach file">
                <Button icon={<PaperClipOutlined />} type="text" style={{ color: '#888' }} />
              </Tooltip>
            </Upload>
            <Input.TextArea
              value={text}
              onChange={e => handleTyping(e.target.value)}
              onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ borderRadius: 20, resize: 'none', flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendMessage}
              loading={sending}
              disabled={!text.trim()}
              style={{ borderRadius: 20, height: 36 }}
            >
              Send
            </Button>
          </div>

        </div>
      )}
    </div>
  );
};

export default ChatboxPage;
