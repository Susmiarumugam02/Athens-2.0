from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import json
import requests
import os
from django.conf import settings
import logging
from authentication.tenant_scoped_utils import ensure_tenant_context

logger = logging.getLogger(__name__)

# Simple dictionary for common words
COMMON_TRANSLATIONS = {
    'en': {
        'ta': {
            'hello': 'வணக்கம்',
            'hi': 'வணக்கம்',
            'thank you': 'நன்றி',
            'thanks': 'நன்றி',
            'good morning': 'காலை வணக்கம்',
            'good evening': 'மாலை வணக்கம்',
            'how are you': 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
            'yes': 'ஆம்',
            'no': 'இல்லை',
            'please': 'தயவுசெய்து',
            'sorry': 'மன்னிக்கவும்',
            'excuse me': 'மன்னிக்கவும்',
            'goodbye': 'பிரியாவிடை',
            'bye': 'பிரியாவிடை',
        },
        'hi': {
            'hello': 'नमस्ते',
            'hi': 'नमस्ते',
            'thank you': 'धन्यवाद',
            'thanks': 'धन्यवाद',
            'good morning': 'सुप्रभात',
            'how are you': 'आप कैसे हैं?',
            'yes': 'हाँ',
            'no': 'नहीं',
        },
        'es': {
            'hello': 'hola',
            'hi': 'hola',
            'thank you': 'gracias',
            'thanks': 'gracias',
            'good morning': 'buenos días',
            'yes': 'sí',
            'no': 'no',
        },
        'fr': {
            'hello': 'bonjour',
            'hi': 'salut',
            'thank you': 'merci',
            'thanks': 'merci',
            'good morning': 'bonjour',
            'yes': 'oui',
            'no': 'non',
        },
        'de': {
            'hello': 'hallo',
            'hi': 'hallo',
            'thank you': 'danke',
            'thanks': 'danke',
            'good morning': 'guten morgen',
            'yes': 'ja',
            'no': 'nein',
        }
    }
}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def translate_text(request):
    try:
        ensure_tenant_context(request)
        logger.info(f"Translation request received from {request.META.get('REMOTE_ADDR')}")
        
        if hasattr(request, 'data'):
            data = request.data
        else:
            data = json.loads(request.body)
            
        text = data.get('text', '').strip()
        from_lang = data.get('from', 'en')
        to_lang = data.get('to', 'ta')
        
        logger.info(f"Translating '{text}' from {from_lang} to {to_lang}")
        
        if not text:
            return JsonResponse({'error': 'Text is required'}, status=400)
        
        # Check if we have a direct translation in our dictionary
        if (from_lang in COMMON_TRANSLATIONS and 
            to_lang in COMMON_TRANSLATIONS[from_lang] and 
            text in COMMON_TRANSLATIONS[from_lang][to_lang]):
            
            translated_text = COMMON_TRANSLATIONS[from_lang][to_lang][text]
            return JsonResponse({
                'translatedText': translated_text,
                'originalText': text,
                'fromLanguage': from_lang,
                'toLanguage': to_lang
            })
        
        # Fallback to MyMemory API for other words
        try:
            url = "https://api.mymemory.translated.net/get"
            
            params = {
                'q': text,
                'langpair': f'{from_lang}|{to_lang}'
            }
            
            logger.info(f"Making request to MyMemory API: {url}")
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('responseStatus') == 200:
                    translated_text = result['responseData']['translatedText']
                    
                    logger.info(f"Translation successful: {translated_text}")
                    return JsonResponse({
                        'translatedText': translated_text,
                        'originalText': text,
                        'fromLanguage': from_lang,
                        'toLanguage': to_lang
                    })
                else:
                    logger.error(f"MyMemory API error: {result}")
                    return JsonResponse({'error': 'Translation service returned an error'}, status=500)
            else:
                logger.error(f"MyMemory API HTTP error: {response.status_code}")
                return JsonResponse({'error': f'Translation service error: {response.status_code}'}, status=500)
        except requests.exceptions.Timeout:
            logger.error("MyMemory API timeout")
            return JsonResponse({'error': 'Translation service timeout'}, status=500)
        except requests.exceptions.RequestException as e:
            logger.error(f"MyMemory API request error: {str(e)}")
            return JsonResponse({'error': 'Translation service unavailable'}, status=500)
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in translate_text: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def supported_languages(request):
    """Return list of supported languages"""
    ensure_tenant_context(request)
    languages = [
        {'code': 'en', 'name': 'English'},
        {'code': 'ta', 'name': 'Tamil'},
        {'code': 'hi', 'name': 'Hindi'},
        {'code': 'es', 'name': 'Spanish'},
        {'code': 'fr', 'name': 'French'},
        {'code': 'de', 'name': 'German'},
        {'code': 'zh', 'name': 'Chinese'},
        {'code': 'ja', 'name': 'Japanese'},
        {'code': 'ko', 'name': 'Korean'},
        {'code': 'ar', 'name': 'Arabic'},
        {'code': 'ru', 'name': 'Russian'},
        {'code': 'pt', 'name': 'Portuguese'},
        {'code': 'it', 'name': 'Italian'},
        {'code': 'nl', 'name': 'Dutch'},
        {'code': 'pl', 'name': 'Polish'},
        {'code': 'tr', 'name': 'Turkish'},
        {'code': 'th', 'name': 'Thai'},
        {'code': 'vi', 'name': 'Vietnamese'},
        {'code': 'id', 'name': 'Indonesian'},
        {'code': 'ms', 'name': 'Malay'},
    ]
    
    return JsonResponse({'languages': languages})
