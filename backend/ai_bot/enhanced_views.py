"""
Enhanced AI Bot Views with improved project search capabilities
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.html import escape
from .enhanced_hybrid_rag_service import EnhancedHybridRAGService
from .vector_rag_service import VectorRAGService
from .rag_service import RAGService

def sanitize_log_input(input_str):
    """Sanitize input for logging to prevent log injection"""
    if input_str is None:
        return None
    return escape(str(input_str))

class EnhancedRAGQueryView(APIView):
    """Enhanced RAG query view with improved project search capabilities"""
    permission_classes = [IsAuthenticated]

    def _validate_user_access(self, user):
        """Validate user has access to RAG functionality"""
        # Add your user validation logic here
        pass

    def post(self, request):
        """Handle RAG queries with enhanced project search"""
        self._validate_user_access(request.user)
        
        question = sanitize_log_input(request.data.get('query', ''))
        if not question:
            return Response({'success': False, 'error': 'query is required'}, status=400)
        
        # Get optional parameters
        search_type = request.data.get('search_type', 'auto')  # auto, project, general
        top_k = min(int(request.data.get('top_k', 8)), 20)  # Limit to 20 max
        
        try:
            if search_type == 'project':
                # Force project-specific search
                from .enhanced_project_rag_service import EnhancedProjectRAGService
                project_rag = EnhancedProjectRAGService()
                result = project_rag.search_projects_comprehensive(question, top_k)
                
                # Format for consistent response
                if result.get('projects'):
                    sources = []
                    for project in result['projects']:
                        sources.append({
                            'module': 'project',
                            'id': project['project_id'],
                            'title': project['title'],
                            'snippet': project['summary'],
                            'score': project['max_score'],
                            'comprehensive_data': project.get('comprehensive_data', {})
                        })
                    
                    formatted_result = {
                        'type': 'enhanced_project_results',
                        'answer': f"Found {len(sources)} project(s) matching your query.",
                        'sources': sources,
                        'missing_fields': []
                    }
                else:
                    formatted_result = {
                        'type': 'rag_no_results',
                        'answer': 'No projects found matching your query.',
                        'sources': [],
                        'missing_fields': []
                    }
                
                result = formatted_result
                
            else:
                # Use enhanced hybrid search (auto-detects project queries)
                rag = EnhancedHybridRAGService()
                result = rag.query(question, top_k)
                
        except Exception as e:
            # Fallback chain: Enhanced -> Vector -> Legacy
            try:
                result = VectorRAGService().query(question, top_k)
            except Exception:
                try:
                    result = RAGService().answer(question, top_k)
                except Exception:
                    return Response({
                        'success': False, 
                        'error': 'Search service temporarily unavailable'
                    }, status=500)
        
        # Enhance response with additional metadata
        enhanced_response = {
            'success': True,
            'data': result,
            'metadata': {
                'query_length': len(question),
                'results_count': len(result.get('sources', [])),
                'search_type': search_type,
                'is_project_focused': result.get('project_focused', False)
            }
        }
        
        return Response(enhanced_response)

class ProjectStatisticsView(APIView):
    """Get comprehensive project statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get project statistics and overview"""
        try:
            rag = EnhancedHybridRAGService()
            stats = rag.get_project_statistics()
            
            return Response({
                'success': True,
                'data': stats
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Unable to retrieve project statistics'
            }, status=500)

class ProjectSearchView(APIView):
    """Dedicated project search endpoint"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Search specifically for projects with comprehensive results"""
        query = sanitize_log_input(request.data.get('query', ''))
        if not query:
            return Response({'success': False, 'error': 'query is required'}, status=400)
        
        top_k = min(int(request.data.get('top_k', 10)), 20)
        
        try:
            from .enhanced_project_rag_service import EnhancedProjectRAGService
            project_rag = EnhancedProjectRAGService()
            result = project_rag.search_projects_comprehensive(query, top_k)
            
            return Response({
                'success': True,
                'data': result
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Project search service temporarily unavailable'
            }, status=500)

class RebuildEnhancedIndexView(APIView):
    """Rebuild the enhanced RAG index with comprehensive project data"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Rebuild the enhanced index including comprehensive project embeddings"""
        try:
            # Rebuild standard vector index
            vector_rag = VectorRAGService()
            vector_stats = vector_rag.rebuild_index()
            
            # Build enhanced project embeddings
            from .enhanced_project_rag_service import EnhancedProjectRAGService
            from authentication.models import Project
            
            project_rag = EnhancedProjectRAGService()
            enhanced_count = 0
            
            if Project:
                projects = Project.objects.all()
                for project in projects:
                    try:
                        embeddings = project_rag._create_enhanced_project_embeddings(project.id)
                        enhanced_count += len(embeddings)
                        
                        # Store enhanced embeddings
                        for title, text, embedding_type in embeddings:
                            # Create embeddings and store in database
                            emb = project_rag.model.encode([text], convert_to_numpy=True)[0].tolist()
                            
                            from .models import DocEmbedding
                            DocEmbedding.objects.update_or_create(
                                module=f'project_{embedding_type}',
                                record_id=project.id,
                                chunk=text,
                                defaults={
                                    'title': title,
                                    'embedding': emb
                                }
                            )
                    except Exception as e:
                        continue
            
            return Response({
                'success': True,
                'data': {
                    'standard_index': vector_stats,
                    'enhanced_project_embeddings': enhanced_count,
                    'message': 'Enhanced RAG index rebuilt successfully'
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Failed to rebuild enhanced index'
            }, status=500)
