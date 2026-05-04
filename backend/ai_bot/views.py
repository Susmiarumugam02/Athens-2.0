"""
AI Bot API endpoints
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import PermissionDenied
from .enhanced_ai_service import EnhancedAIService
from .rag_service import RAGService
from .vector_rag_service import VectorRAGService
from .hybrid_rag_service import HybridRAGService
from authentication.security_utils import sanitize_log_input
from django.utils.html import escape

class AIQueryView(APIView):
    """Handle AI queries"""
    permission_classes = [IsAuthenticated]
    
    def _validate_user_access(self, user):
        """Server-side validation of user permissions"""
        if not user.is_active:
            raise PermissionDenied("User account is inactive")
        
        # Validate user has proper role
        allowed_roles = ['master', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser', 'adminuser']
        if not hasattr(user, 'admin_type') or user.admin_type not in allowed_roles:
            raise PermissionDenied("Insufficient permissions for AI access")
    
    def post(self, request):
        # Server-side authorization check
        self._validate_user_access(request.user)
        
        query = sanitize_log_input(request.data.get('query', ''))
        
        try:
            service = EnhancedAIService()
            result = service.process_query(query, request.user.id)
            
            return Response({
                'success': True,
                'data': result,
                'query': query
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'data': {
                    'type': 'error',
                    'message': f'Sorry, I encountered an error processing "{query}". Please try again.',
                    'suggestions': ['Try a simpler query', 'Check your connection', 'Contact support']
                }
            }, status=500)

class DashboardDataView(APIView):
    """Get AI-powered dashboard data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Server-side authorization check
        self._validate_user_access(request.user)
        
        try:
            service = ComprehensiveAIService()
            result = service.process_query('dashboard overview', request.user.id)
            
            return Response({
                'success': True,
                'data': result
            })
        except PermissionDenied as e:
            return Response({
                'success': False,
                'error': 'Access denied'
            }, status=403)
        except Exception as e:
            logger.error(f"Dashboard data error: {sanitize_log_input(str(e))}")
            return Response({
                'success': False,
                'error': 'Internal server error'
            }, status=500)
    
    def _validate_user_access(self, user):
        """Server-side validation of user permissions"""
        if not user.is_active:
            raise PermissionDenied("User account is inactive")
        
        allowed_roles = ['master', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser', 'adminuser']
        if not hasattr(user, 'admin_type') or user.admin_type not in allowed_roles:
            raise PermissionDenied("Insufficient permissions for AI access")

class SearchView(APIView):
    """Search across all modules"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Server-side authorization check
        self._validate_user_access(request.user)
        
        query = sanitize_log_input(request.data.get('query', ''))
        
        # Input validation
        if len(query) > 500:
            return Response({
                'success': False,
                'error': 'Query too long'
            }, status=400)
        
        try:
            service = ComprehensiveAIService()
            result = service.universal_search(query, request.user.id)
            
            return Response({
                'success': True,
                'results': result.get('results', []),
                'count': result.get('total_results', 0),
                'module_breakdown': result.get('module_breakdown', {})
            })
        except PermissionDenied as e:
            return Response({
                'success': False,
                'error': 'Access denied'
            }, status=403)
        except Exception as e:
            logger.error(f"Search error: {sanitize_log_input(str(e))}")
            return Response({
                'success': False,
                'error': 'Internal server error'
            }, status=500)
    
    def _validate_user_access(self, user):
        """Server-side validation of user permissions"""
        if not user.is_active:
            raise PermissionDenied("User account is inactive")
        
        allowed_roles = ['master', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser', 'adminuser']
        if not hasattr(user, 'admin_type') or user.admin_type not in allowed_roles:
            raise PermissionDenied("Insufficient permissions for AI access")

class TextSuggestionView(APIView):
    """Get text suggestions for forms"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Server-side authorization check
        self._validate_user_access(request.user)

        context = sanitize_log_input(request.data.get('context', ''))
        partial_text = sanitize_log_input(request.data.get('partial_text', ''))

        # Input validation
        if len(context) > 50 or len(partial_text) > 100:
            return Response({
                'success': False,
                'error': 'Input too long'
            }, status=400)

        suggestions_map = {
            'incident': ['Equipment malfunction', 'Safety protocol violation', 'Environmental hazard', 'Personnel injury', 'Property damage'],
            'safety': ['Unsafe working conditions', 'Missing safety equipment', 'Improper use of tools', 'Blocked emergency exits', 'Poor housekeeping'],
            'ptw': ['Hot work permit', 'Confined space entry', 'Working at height', 'Electrical work', 'Excavation work']
        }

        suggestions = suggestions_map.get(context, ['General observation', 'Process improvement', 'Training needed'])

        if partial_text:
            suggestions = [s for s in suggestions if partial_text.lower() in s.lower()]

        return Response({
            'success': True,
            'suggestions': suggestions[:5]
        })

    def _validate_user_access(self, user):
        """Server-side validation of user permissions"""
        if not user.is_active:
            raise PermissionDenied("User account is inactive")

        allowed_roles = ['master', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser', 'adminuser']
        if not hasattr(user, 'admin_type') or user.admin_type not in allowed_roles:
            raise PermissionDenied("Insufficient permissions for AI access")

class RAGQueryView(APIView):
    """Enhanced RAG with universal database search capabilities"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        self._validate_user_access(request.user)
        question = sanitize_log_input(request.data.get('query', ''))
        if not question:
            return Response({'success': False, 'error': 'query is required'}, status=400)

        try:
            # First try enhanced AI service
            from .enhanced_ai_service import EnhancedAIService
            enhanced_ai = EnhancedAIService()
            result = enhanced_ai.process_query(question)

            # If enhanced AI found results, return them
            if result.get('type') == 'enhanced_ai_response':
                return Response({'success': True, 'data': result})

            # Otherwise fallback to RAG
            rag = HybridRAGService()
            result = rag.query(question)

        except Exception:
            # Fallback to vector then legacy TF-IDF RAG if needed
            try:
                result = VectorRAGService().query(question)
            except Exception:
                result = RAGService().answer(question)

        return Response({'success': True, 'data': result})

    def _validate_user_access(self, user):
        if not user.is_active:
            raise PermissionDenied("User account is inactive")
        allowed_roles = ['master', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser', 'adminuser']
        if not hasattr(user, 'admin_type') or user.admin_type not in allowed_roles:
            raise PermissionDenied("Insufficient permissions for AI access")

class RAGReindexView(APIView):
    """Build or rebuild the local RAG index from database"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        self._validate_user_access(request.user)
        try:
            rag = VectorRAGService()
            stats = rag.rebuild_index()
        except Exception:
            # Fallback to legacy TF-IDF
            rag = RAGService()
            stats = rag.rebuild_index()
        return Response({'success': True, 'stats': stats})

    def _validate_user_access(self, user):
        if not user.is_active:
            raise PermissionDenied("User account is inactive")
        if getattr(user, 'admin_type', None) != 'master' and not getattr(user, 'is_superuser', False):
            raise PermissionDenied("Only master can rebuild index")
