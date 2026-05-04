import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Select, Button, Input, Row, Col, Tag, Alert,
  Divider, Space, Typography, Tooltip, Spin,
} from 'antd';
import {
  AudioOutlined, AudioMutedOutlined, TranslationOutlined,
  SwapOutlined, CopyOutlined, SoundOutlined, ClearOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../lib/api';

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const { TextArea } = Input;
const { Title, Text } = Typography;

// ─── Language list (matches backend) ─────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
];

// Speech recognition browser locale codes
const SPEECH_LOCALE: Record<string, string> = {
  en: 'en-US', ta: 'ta-IN', hi: 'hi-IN', es: 'es-ES',
  fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP',
  ko: 'ko-KR', ar: 'ar-SA', ru: 'ru-RU', pt: 'pt-BR',
  it: 'it-IT', nl: 'nl-NL', tr: 'tr-TR', th: 'th-TH',
  vi: 'vi-VN', id: 'id-ID', ms: 'ms-MY',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: number;
  original: string;
  translated: string;
  from: string;
  to: string;
  time: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const VoiceTranslatorPage: React.FC = () => {
  const [fromLang, setFromLang]         = useState('en');
  const [toLang, setToLang]             = useState('ta');
  const [inputText, setInputText]       = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [recording, setRecording]       = useState(false);
  const [translating, setTranslating]   = useState(false);
  const [error, setError]               = useState('');
  const [copied, setCopied]             = useState(false);
  const [history, setHistory]           = useState<HistoryItem[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Check browser speech support
  useEffect(() => {
    const isSpeechSupported =
      'webkitSpeechRecognition' in window ||
      'SpeechRecognition' in window;
    setSpeechSupported(isSpeechSupported);
  }, []);

  // ── Start voice recording ──
  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    setError('');
    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LOCALE[fromLang] || fromLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setRecording(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      // Auto-translate after voice input
      translateText(transcript);
    };

    recognition.onerror = (event: any) => {
      setRecording(false);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  // ── Translate via backend ──
  const translateText = async (text?: string) => {
    const textToTranslate = (text ?? inputText).trim();
    if (!textToTranslate) return;
    if (fromLang === toLang) {
      setTranslatedText(textToTranslate);
      return;
    }

    setTranslating(true);
    setError('');
    try {
      const res = await apiClient.post('/api/voice-translator/translate/', {
        text: textToTranslate,
        from: fromLang,
        to: toLang,
      });
      const result = res.data.translatedText;
      setTranslatedText(result);
      // Add to history
      setHistory(prev => [{
        id: Date.now(),
        original: textToTranslate,
        translated: result,
        from: fromLang,
        to: toLang,
        time: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)]);
    } catch {
      setError('Translation failed. Please check your connection and try again.');
    } finally {
      setTranslating(false);
    }
  };

  // ── Swap languages ──
  const swapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  // ── Text-to-speech ──
  const speak = (text: string, lang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALE[lang] || lang;
    window.speechSynthesis.speak(utterance);
  };

  // ── Copy to clipboard ──
  const copyTranslation = () => {
    navigator.clipboard.writeText(translatedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const langName = (code: string) => LANGUAGES.find(l => l.code === code)?.name ?? code;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <TranslationOutlined style={{ marginRight: 10, color: '#1890ff' }} />
          Voice Translator
        </Title>
        <Text type="secondary">Speak or type in any language — get instant translation</Text>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />
      )}

      {!speechSupported && (
        <div className="warning" style={{ marginBottom: 16, padding: '8px 16px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '6px', color: '#d46b08' }}>
          Voice input not supported. Please use Chrome or Edge.
        </div>
      )}

      {/* ── Language selector ── */}
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" gutter={16}>
          <Col flex="1">
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>FROM</Text>
            </div>
            <Select
              value={fromLang}
              onChange={setFromLang}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              options={LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
            />
          </Col>
          <Col>
            <Tooltip title="Swap languages">
              <Button
                icon={<SwapOutlined />}
                onClick={swapLanguages}
                style={{ marginTop: 20 }}
                type="default"
              />
            </Tooltip>
          </Col>
          <Col flex="1">
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>TO</Text>
            </div>
            <Select
              value={toLang}
              onChange={setToLang}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              options={LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
            />
          </Col>
        </Row>
      </Card>

      {/* ── Input / Output panels ── */}
      <Row gutter={16}>
        {/* Input */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <Tag color="blue">{langName(fromLang)}</Tag>
                <Text style={{ fontSize: 13 }}>Input</Text>
              </Space>
            }
            extra={
              <Space>
                <Tooltip title={recording ? 'Stop recording' : 'Start voice input'}>
                  <Button
                    type={recording ? 'primary' : 'default'}
                    danger={recording}
                    icon={recording ? <AudioMutedOutlined /> : <AudioOutlined />}
                    onClick={recording ? stopRecording : startRecording}
                    disabled={!speechSupported}
                  >
                    {recording ? 'Stop' : 'Speak'}
                  </Button>
                </Tooltip>
                {inputText && (
                  <Tooltip title="Listen">
                    <Button icon={<SoundOutlined />} type="text" onClick={() => speak(inputText, fromLang)} />
                  </Tooltip>
                )}
                {inputText && (
                  <Tooltip title="Clear">
                    <Button icon={<ClearOutlined />} type="text" onClick={() => { setInputText(''); setTranslatedText(''); }} />
                  </Tooltip>
                )}
              </Space>
            }
            style={{ height: '100%' }}
          >
            {recording && (
              <div style={{ textAlign: 'center', padding: '8px 0', marginBottom: 8 }}>
                <Spin size="small" />
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>Listening...</Text>
              </div>
            )}
            <TextArea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Type or speak in ${langName(fromLang)}...`}
              rows={6}
              style={{ resize: 'none', fontSize: 15 }}
            />
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<TranslationOutlined />}
                onClick={() => translateText()}
                loading={translating}
                disabled={!inputText.trim()}
              >
                Translate
              </Button>
            </div>
          </Card>
        </Col>

        {/* Output */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <Tag color="green">{langName(toLang)}</Tag>
                <Text style={{ fontSize: 13 }}>Translation</Text>
              </Space>
            }
            extra={
              translatedText && (
                <Space>
                  <Tooltip title="Listen to translation">
                    <Button icon={<SoundOutlined />} type="text" onClick={() => speak(translatedText, toLang)} />
                  </Tooltip>
                  <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <Button
                      icon={<CopyOutlined />}
                      type="text"
                      onClick={copyTranslation}
                      style={{ color: copied ? '#52c41a' : undefined }}
                    />
                  </Tooltip>
                </Space>
              )
            }
            style={{ height: '100%' }}
          >
            {translating ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin />
                <div style={{ marginTop: 8, color: '#888' }}>Translating...</div>
              </div>
            ) : (
              <TextArea
                value={translatedText}
                readOnly
                placeholder="Translation will appear here..."
                rows={6}
                style={{ resize: 'none', fontSize: 15, background: '#fafafa' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── History ── */}
      {history.length > 0 && (
        <>
          <Divider orientation="left" style={{ marginTop: 24 }}>Recent Translations</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(item => (
              <Card
                key={item.id}
                size="small"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setFromLang(item.from);
                  setToLang(item.to);
                  setInputText(item.original);
                  setTranslatedText(item.translated);
                }}
              >
                <Row gutter={16} align="middle">
                  <Col flex="1">
                    <Text strong style={{ fontSize: 13 }}>{item.original}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      <Tag color="blue" style={{ fontSize: 10 }}>{langName(item.from)}</Tag>
                    </Text>
                  </Col>
                  <Col>
                    <SwapOutlined style={{ color: '#bbb' }} />
                  </Col>
                  <Col flex="1">
                    <Text style={{ fontSize: 13 }}>{item.translated}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      <Tag color="green" style={{ fontSize: 10 }}>{langName(item.to)}</Tag>
                    </Text>
                  </Col>
                  <Col>
                    <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceTranslatorPage;
