/**
 * useVoiceAutoFill
 * Extends voice input to automatically populate ConsideringParameters
 * and trigger auto-fill across the form.
 */
import { useCallback, useRef, useState } from 'react';
import type { ConsideringParameters } from './useConsideringParameters';

interface UseVoiceAutoFillOptions {
  onParametersDetected: (params: Partial<ConsideringParameters>) => void;
  onTranscript: (text: string, field: string) => void;
  language?: string;
}

const DEPARTMENT_KEYWORDS: Record<string, string> = {
  electrical: 'Electrical',
  'panel room': 'Electrical',
  transformer: 'Electrical',
  inverter: 'Electrical',
  civil: 'Civil',
  scaffold: 'Civil',
  excavation: 'Civil',
  mechanical: 'Mechanical',
  pump: 'Mechanical',
  compressor: 'Mechanical',
  operations: 'Operations',
  production: 'Operations',
  chemical: 'Chemical',
  quality: 'Quality',
  hse: 'HSE',
  safety: 'HSE',
};

const WORK_TYPE_KEYWORDS: Record<string, string> = {
  'hot work': 'Hot Work',
  welding: 'Hot Work',
  cutting: 'Hot Work',
  grinding: 'Hot Work',
  'confined space': 'Confined Space',
  'work at height': 'Work at Height',
  scaffold: 'Work at Height',
  ladder: 'Work at Height',
  'electrical work': 'Electrical Work',
  excavation: 'Excavation',
  'chemical handling': 'Chemical Handling',
  'crane lifting': 'Crane Lifting',
  rigging: 'Crane Lifting',
};

const RISK_KEYWORDS: Record<string, string> = {
  critical: 'Critical',
  fatal: 'Critical',
  'life threatening': 'Critical',
  explosion: 'Critical',
  high: 'High',
  serious: 'High',
  major: 'High',
  medium: 'Medium',
  moderate: 'Medium',
  minor: 'Low',
  low: 'Low',
  negligible: 'Low',
};

function extractParametersFromText(text: string): Partial<ConsideringParameters> {
  const lower = text.toLowerCase();
  const detected: Partial<ConsideringParameters> = {};

  for (const [keyword, dept] of Object.entries(DEPARTMENT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      detected.department = dept;
      break;
    }
  }

  for (const [keyword, workType] of Object.entries(WORK_TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      detected.work_type = workType;
      break;
    }
  }

  for (const [keyword, risk] of Object.entries(RISK_KEYWORDS)) {
    if (lower.includes(keyword)) {
      detected.risk_category = risk;
      break;
    }
  }

  // Extract site mentions
  if (lower.includes('chennai')) detected.site = 'Chennai Plant';
  else if (lower.includes('mumbai')) detected.site = 'Mumbai Site';
  else if (lower.includes('delhi')) detected.site = 'Delhi Office';
  else if (lower.includes('bangalore')) detected.site = 'Bangalore Facility';

  // Extract shift mentions
  if (lower.includes('night shift')) detected.shift = 'Night Shift';
  else if (lower.includes('day shift')) detected.shift = 'Day Shift';
  else if (lower.includes('general shift')) detected.shift = 'General Shift';

  return detected;
}

export function useVoiceAutoFill({
  onParametersDetected,
  onTranscript,
  language = 'en-IN',
}: UseVoiceAutoFillOptions) {
  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  const startVoice = useCallback(
    (field: string) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setActiveField(field);
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        if (interim) setInterimText(interim);
        if (final) {
          // Detect parameters from the spoken text
          const detected = extractParametersFromText(final);
          if (Object.keys(detected).length > 0) {
            onParametersDetected(detected);
          }
          onTranscript(final, field);
          setInterimText('');
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setActiveField(null);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveField(null);
        recognitionRef.current = null;
      };

      try {
        recognition.start();
      } catch {
        setIsListening(false);
        setActiveField(null);
      }
    },
    [language, onParametersDetected, onTranscript],
  );

  const stopVoice = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
    setActiveField(null);
    setInterimText('');
  }, []);

  return { isListening, activeField, interimText, startVoice, stopVoice };
}
