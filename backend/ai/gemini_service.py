"""
Athens AI — Gemini Service Layer
Production-grade Gemini integration using google-genai SDK.
API key lives here only — never sent to frontend.
"""
import os
import json
import hashlib
import logging
import time
from typing import Optional

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger('athens.ai')

# ─── Configuration ─────────────────────────────────────────────────────────────

GEMINI_API_KEY  = os.getenv('GEMINI_API_KEY', '')
MODEL_FLASH     = os.getenv('GEMINI_MODEL_FLASH', 'gemini-2.5-flash')
MODEL_PRO       = os.getenv('GEMINI_MODEL_PRO',   'gemini-2.5-pro')
CACHE_TTL       = int(os.getenv('GEMINI_CACHE_TTL', '3600'))
MAX_RETRIES     = int(os.getenv('GEMINI_MAX_RETRIES', '3'))
RETRY_DELAY     = float(os.getenv('GEMINI_RETRY_DELAY', '1.0'))
TIMEOUT_MS      = int(os.getenv('GEMINI_TIMEOUT_MS', '30000'))

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not GEMINI_API_KEY:
        return None
    try:
        from google import genai
        _client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info(f'[Athens AI] Gemini client initialized — flash={MODEL_FLASH}')
        return _client
    except Exception as e:
        logger.error(f'[Athens AI] Failed to initialize Gemini client: {e}')
        return None


def _cache_key(prefix: str, payload: str) -> str:
    h = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return f'athens_ai:{prefix}:{h}'


def gemini_generate(
    prompt: str,
    model: str = None,
    use_cache: bool = True,
    cache_prefix: str = 'gen',
    temperature: float = 0.3,
) -> Optional[str]:
    """
    Call Gemini with retry, caching, and structured logging.
    Returns raw text or None on failure.
    """
    if not getattr(settings, 'AI_ENABLED', True):
        return None

    if not GEMINI_API_KEY:
        return None

    model = model or MODEL_FLASH

    if use_cache:
        key = _cache_key(cache_prefix, f'{model}:{prompt}')
        cached = cache.get(key)
        if cached:
            logger.debug(f'[Athens AI] Cache hit: {key}')
            return cached

    client = _get_client()
    if not client:
        return None

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            from google.genai import types
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=2048,
                    http_options=types.HttpOptions(timeout=TIMEOUT_MS),
                ),
            )
            text = response.text.strip() if response.text else ''
            if not text:
                raise ValueError('Empty response from Gemini')

            if use_cache:
                cache.set(key, text, CACHE_TTL)

            logger.info(f'[Athens AI] OK attempt={attempt} model={model} chars={len(text)}')
            return text

        except Exception as e:
            last_error = e
            logger.warning(f'[Athens AI] Attempt {attempt}/{MAX_RETRIES} failed: {e}')
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)

    logger.error(f'[Athens AI] All retries exhausted: {last_error}')
    return None


def gemini_json(
    prompt: str,
    model: str = None,
    use_cache: bool = True,
    cache_prefix: str = 'json',
    fallback: dict = None,
) -> dict:
    """Call Gemini and parse JSON response. Returns fallback dict on failure."""
    # Append JSON instruction to prompt
    json_prompt = prompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation.'
    raw = gemini_generate(json_prompt, model=model, use_cache=use_cache, cache_prefix=cache_prefix)
    if not raw:
        return fallback or {}
    try:
        clean = raw.strip()
        # Strip markdown code fences
        if clean.startswith('```'):
            lines = clean.split('\n')
            clean = '\n'.join(lines[1:])
            clean = clean.rsplit('```', 1)[0].strip()
        return json.loads(clean)
    except json.JSONDecodeError as e:
        logger.warning(f'[Athens AI] JSON parse error: {e} — raw={raw[:300]}')
        return fallback or {}


def gemini_audio_json(
    prompt: str,
    audio_bytes: bytes,
    mime_type: str,
    model: str = None,
    fallback: dict = None,
) -> dict:
    """Send voice audio to Gemini and parse a JSON response."""
    if not getattr(settings, 'AI_ENABLED', True) or not GEMINI_API_KEY:
        return fallback or {}

    client = _get_client()
    if not client:
        return fallback or {}

    model = model or MODEL_FLASH
    json_prompt = prompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation.'
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            from google.genai import types
            response = client.models.generate_content(
                model=model,
                contents=[
                    json_prompt,
                    types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=2048,
                    http_options=types.HttpOptions(timeout=TIMEOUT_MS),
                ),
            )
            raw = response.text.strip() if response.text else ''
            if raw.startswith('```'):
                lines = raw.split('\n')
                raw = '\n'.join(lines[1:])
                raw = raw.rsplit('```', 1)[0].strip()
            parsed = json.loads(raw)
            logger.info(f'[Athens AI] Voice OK attempt={attempt} model={model} bytes={len(audio_bytes)}')
            return parsed
        except Exception as e:
            last_error = e
            logger.warning(f'[Athens AI] Voice attempt {attempt}/{MAX_RETRIES} failed: {e}')
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)

    logger.error(f'[Athens AI] Voice retries exhausted: {last_error}')
    return fallback or {}


def gemini_file_json(
    prompt: str,
    file_bytes: bytes,
    mime_type: str,
    model: str = None,
    fallback: dict = None,
) -> dict:
    """Send an image/document file to Gemini and parse a JSON response."""
    if not getattr(settings, 'AI_ENABLED', True) or not GEMINI_API_KEY:
        return fallback or {}

    client = _get_client()
    if not client:
        return fallback or {}

    model = model or MODEL_FLASH
    json_prompt = prompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation.'
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            from google.genai import types
            response = client.models.generate_content(
                model=model,
                contents=[
                    json_prompt,
                    types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=2048,
                    http_options=types.HttpOptions(timeout=TIMEOUT_MS),
                ),
            )
            raw = response.text.strip() if response.text else ''
            if raw.startswith('```'):
                lines = raw.split('\n')
                raw = '\n'.join(lines[1:])
                raw = raw.rsplit('```', 1)[0].strip()
            return json.loads(raw)
        except Exception as e:
            last_error = e
            logger.warning(f'[Athens AI] File attempt {attempt}/{MAX_RETRIES} failed: {e}')
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)

    logger.error(f'[Athens AI] File retries exhausted: {last_error}')
    return fallback or {}


def is_available() -> bool:
    """Check if Gemini is configured and client can be created."""
    return bool(GEMINI_API_KEY) and _get_client() is not None
