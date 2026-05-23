import { useState, useRef, useCallback, useEffect } from 'react'
import { analyzePTW, smartAutofill, validatePTW, translateVoice } from '../../../services/aiService'
import type { PTWAnalysis, PTWValidation, SmartAutofillResult, TranslationResult } from '../../../services/aiService'

export type { PTWAnalysis as AIAnalysis, PTWValidation as AIValidation }
export interface VoiceResult extends TranslationResult {}
export type VoiceConversionMeta = Pick<TranslationResult, 'detected_language' | 'conversion_note' | 'source'>

// ─── Web Speech API global types ───────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

const getSpeechRecognition = (): any =>
  window.SpeechRecognition || window.webkitSpeechRecognition || null

// ─── Helpers ───────────────────────────────────────────────────────────────────
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

// Normalize to professional English sentence
const normalizeSentence = (text: string): string => {
  const t = (text || '').trim()
  if (!t) return ''
  const ended = /[.!?]$/.test(t) ? t : t + '.'
  return ended.charAt(0).toUpperCase() + ended.slice(1)
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function usePTWAI() {
  const [analysis, setAnalysis] = useState<PTWAnalysis | null>(null)
  const [validation, setValidation] = useState<PTWValidation | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceProcessing, setVoiceProcessing] = useState(false)
  const [voiceConversionNote, setVoiceConversionNote] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [rawTranscript, setRawTranscript] = useState('')
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  // Refs — never cause re-renders
  const speechRecRef = useRef<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stopTimerRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const interimTranscriptRef = useRef<string>('')
  // Store latest onResult/fieldName so closures always see current values
  const onResultRef = useRef<((p: string, o?: string, m?: VoiceConversionMeta) => void) | null>(null)
  const fieldNameRef = useRef<string>('')

  // ─── Timer helpers ──────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setRecordingSeconds(0)
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = window.setInterval(
      () => setRecordingSeconds(s => s + 1),
      1000
    )
  }, [])

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  // ─── Full cleanup ───────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (stopTimerRef.current) { window.clearTimeout(stopTimerRef.current); stopTimerRef.current = null }
    if (silenceTimerRef.current) { window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (timerIntervalRef.current) { window.clearInterval(timerIntervalRef.current); timerIntervalRef.current = null }

    if (speechRecRef.current) {
      try { speechRecRef.current.abort() } catch {}
      speechRecRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch {}
    }
    recorderRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    chunksRef.current = []
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
  }, [])

  useEffect(() => cleanup, [cleanup])

  // ─── Send transcript to Gemini for professional English conversion ──────────
  const processTranscript = useCallback(async (transcript: string) => {
    const onResult = onResultRef.current
    const fieldName = fieldNameRef.current

    console.log('[Voice] processTranscript — raw:', JSON.stringify(transcript), 'field:', fieldName)

    if (!transcript.trim()) {
      setVoiceError('No speech detected. Please speak clearly and try again.')
      setVoiceProcessing(false)
      return
    }

    setRawTranscript(transcript)

    try {
      console.log('[Voice] Calling translateVoice API...')
      const result = await translateVoice(transcript, 'auto', 'ptw', fieldName)
      console.log('[Voice] API response:', result)

      const professional = result?.professional_english?.trim()
      if (!professional) throw new Error('Empty professional_english in API response')

      const note = result.conversion_note ||
        `Detected: ${result.detected_language || 'Language'} → Converted to English`
      setVoiceConversionNote(note)
      setVoiceError('')
      console.log('[Voice] ✅ Success:', professional)

      onResult?.(professional, transcript, {
        detected_language: result.detected_language,
        conversion_note: note,
        source: result.source,
      })
    } catch (err: any) {
      console.warn('[Voice] Gemini failed:', err?.message || err)
      // FALLBACK: never lose voice data — populate field with raw transcript
      const fallbackText = normalizeSentence(transcript)
      const fallbackNote = 'Voice captured — AI conversion unavailable, raw transcript used'
      setVoiceConversionNote(fallbackNote)
      setVoiceError('')
      console.log('[Voice] Fallback — using raw transcript:', fallbackText)
      onResult?.(fallbackText, transcript, {
        detected_language: 'auto',
        conversion_note: fallbackNote,
        source: 'fallback',
      })
    } finally {
      setVoiceProcessing(false)
    }
  }, [])

  // ─── Strategy 1: Web Speech API (Chrome/Edge — gives text directly) ─────────
  const startWebSpeech = useCallback((): boolean => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      console.log('[Voice] Web Speech API not available in this browser')
      return false
    }

    console.log('[Voice] Starting Web Speech API')
    const rec = new SpeechRecognition()
    speechRecRef.current = rec
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''

    // Use en-US as base — Gemini handles Tamil/Hindi romanized text perfectly
    // Chrome Web Speech API with en-US still captures romanized Tamil/Hindi
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 3

    rec.onstart = () => {
      console.log('[Voice] Web Speech started')
      setVoiceActive(true)
      startTimer()
    }

    rec.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Pick best alternative
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += t + ' '
        } else {
          interim += t
        }
      }
      if (final) finalTranscriptRef.current += final
      interimTranscriptRef.current = interim
      console.log('[Voice] interim:', interim.trim(), '| final so far:', finalTranscriptRef.current.trim())

      // Silence detection — stop after 2.5s of no new speech
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = window.setTimeout(() => {
        console.log('[Voice] Silence timeout — stopping recognition')
        try { rec.stop() } catch {}
      }, 2500)
    }

    rec.onerror = (event: any) => {
      console.error('[Voice] Web Speech error:', event.error)
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setVoiceError('Microphone permission denied. Please allow microphone access and try again.')
        setVoiceActive(false)
        stopTimer()
      } else if (event.error === 'no-speech') {
        console.warn('[Voice] No speech detected by browser')
        // onend will fire and handle it
      } else if (event.error === 'network') {
        console.warn('[Voice] Network error — Web Speech requires internet in some browsers')
      } else if (event.error === 'aborted') {
        console.log('[Voice] Recognition aborted (expected on manual stop)')
      }
    }

    rec.onend = async () => {
      console.log('[Voice] Web Speech ended')
      stopTimer()
      setVoiceActive(false)
      if (silenceTimerRef.current) { window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
      if (stopTimerRef.current) { window.clearTimeout(stopTimerRef.current); stopTimerRef.current = null }

      const transcript = (finalTranscriptRef.current + ' ' + interimTranscriptRef.current).trim()
      console.log('[Voice] Final combined transcript:', JSON.stringify(transcript))

      if (!transcript) {
        setVoiceError('No speech detected. Please speak clearly and try again.')
        return
      }

      setVoiceProcessing(true)
      await processTranscript(transcript)
    }

    try {
      rec.start()
      // Hard stop after 20 seconds
      stopTimerRef.current = window.setTimeout(() => {
        console.log('[Voice] Hard stop after 20s')
        try { rec.stop() } catch {}
      }, 20000)
      return true
    } catch (err) {
      console.error('[Voice] Failed to start Web Speech:', err)
      speechRecRef.current = null
      return false
    }
  }, [startTimer, stopTimer, processTranscript])

  // ─── Strategy 2: MediaRecorder + Gemini audio (Firefox / Safari fallback) ───
  const startMediaRecorder = useCallback(async () => {
    console.log('[Voice] Starting MediaRecorder path')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || ''

      console.log('[Voice] MediaRecorder mimeType:', mimeType || '(browser default)')
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          console.log('[Voice] Chunk received:', e.data.size, 'bytes')
        }
      }

      recorder.onstop = async () => {
        stopTimer()
        setVoiceActive(false)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        chunksRef.current = []
        console.log('[Voice] Recording blob:', blob.size, 'bytes, type:', blob.type)

        if (blob.size < 500) {
          setVoiceError('Recording too short. Please speak for at least 1 second.')
          return
        }

        setVoiceProcessing(true)

        // Try Gemini audio path first
        try {
          const { translateVoiceAudio } = await import('../../../services/aiService')
          const audioBase64 = await blobToBase64(blob)
          console.log('[Voice] Sending audio to Gemini, base64 length:', audioBase64.length)
          const result = await translateVoiceAudio(audioBase64, blob.type || 'audio/webm', 'ptw', fieldNameRef.current)
          console.log('[Voice] Gemini audio response:', result)

          const professional = result?.professional_english?.trim()
          if (!professional) throw new Error('Empty professional_english from audio API')

          const note = result.conversion_note ||
            `Detected: ${result.detected_language || 'Language'} → Converted to English`
          setVoiceConversionNote(note)
          setVoiceError('')
          onResultRef.current?.(professional, result.original || '', {
            detected_language: result.detected_language,
            conversion_note: note,
            source: result.source,
          })
          setVoiceProcessing(false)
        } catch (audioErr) {
          console.warn('[Voice] Audio API failed, falling back to transcript path:', audioErr)
          // Fallback: use any interim transcript we captured, or show error
          const fallback = interimTranscriptRef.current || finalTranscriptRef.current
          if (fallback.trim()) {
            await processTranscript(fallback)
          } else {
            setVoiceError('Voice could not be converted. Please try again.')
            setVoiceProcessing(false)
          }
        }
      }

      recorder.start(100)
      setVoiceActive(true)
      startTimer()

      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') {
          console.log('[Voice] Auto-stop MediaRecorder after 15s')
          recorder.stop()
        }
      }, 15000)
    } catch (err: any) {
      console.error('[Voice] MediaRecorder setup failed:', err)
      setVoiceActive(false)
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setVoiceError('Microphone permission denied. Please allow microphone access.')
      } else {
        setVoiceError('Microphone unavailable. Please check your device settings.')
      }
    }
  }, [startTimer, stopTimer, processTranscript])

  // ─── Public: startVoice ─────────────────────────────────────────────────────
  const startVoice = useCallback(async (
    onResult: (professional: string, original?: string, meta?: VoiceConversionMeta) => void,
    fieldName = ''
  ) => {
    console.log('[Voice] startVoice — field:', fieldName)

    // Store in refs so closures always see latest values
    onResultRef.current = onResult
    fieldNameRef.current = fieldName

    // Reset state
    setVoiceError('')
    setVoiceConversionNote('')
    setRawTranscript('')
    setRecordingSeconds(0)

    // Clean up any previous session
    cleanup()

    // Try Web Speech API first (Chrome/Edge — best quality, no audio upload needed)
    const webSpeechOk = startWebSpeech()
    if (webSpeechOk) {
      console.log('[Voice] Using Web Speech API path')
      return
    }

    // Fallback: MediaRecorder + Gemini audio transcription
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      console.log('[Voice] Using MediaRecorder path')
      await startMediaRecorder()
      return
    }

    setVoiceError('Voice input is not supported in this browser. Please use Chrome or Edge.')
  }, [cleanup, startWebSpeech, startMediaRecorder])

  // ─── Public: stopVoice ──────────────────────────────────────────────────────
  const stopVoice = useCallback(() => {
    console.log('[Voice] stopVoice called')
    if (stopTimerRef.current) { window.clearTimeout(stopTimerRef.current); stopTimerRef.current = null }
    if (silenceTimerRef.current) { window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }

    // Stop Web Speech (triggers onend → processTranscript)
    if (speechRecRef.current) {
      try { speechRecRef.current.stop() } catch {}
      return
    }

    // Stop MediaRecorder (triggers onstop → processTranscript)
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
      return
    }

    setVoiceActive(false)
    stopTimer()
  }, [stopTimer])

  // ─── AI Analysis ────────────────────────────────────────────────────────────
  const analyze = useCallback(async (description: string, permitTypeCategory = '', project = '') => {
    if (!description || description.length < 5) return
    setAnalyzing(true)
    try {
      const result = await analyzePTW(description, permitTypeCategory, project)
      setAnalysis(result)
      return result
    } catch {
      // AI is enhancement only — silent fail
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const validate = useCallback(async (formData: Record<string, any>) => {
    setValidating(true)
    try {
      const result = await validatePTW(formData)
      setValidation(result)
      return result
    } catch {
      return null
    } finally {
      setValidating(false)
    }
  }, [])

  const autofill = useCallback(async (context: Record<string, any>): Promise<SmartAutofillResult | null> => {
    setAutofilling(true)
    try {
      return await smartAutofill(context)
    } catch {
      return null
    } finally {
      setAutofilling(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAnalysis(null)
    setValidation(null)
    setVoiceConversionNote('')
    setVoiceError('')
    setRawTranscript('')
    setRecordingSeconds(0)
  }, [])

  return {
    analysis, analyzing, analyze,
    validation, validating, validate,
    autofilling, autofill,
    voiceActive, voiceProcessing, voiceConversionNote, voiceError,
    rawTranscript, recordingSeconds,
    startVoice, stopVoice,
    reset,
  }
}
