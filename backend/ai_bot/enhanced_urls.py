"""
Enhanced URL configuration for AI Bot with improved project search
"""
from django.urls import path
from .enhanced_views import (
    EnhancedRAGQueryView,
    ProjectStatisticsView,
    ProjectSearchView,
    RebuildEnhancedIndexView
)

# Enhanced URL patterns
enhanced_urlpatterns = [
    # Enhanced RAG query endpoint
    path('rag/enhanced-query/', EnhancedRAGQueryView.as_view(), name='enhanced_rag_query'),
    
    # Project-specific endpoints
    path('projects/search/', ProjectSearchView.as_view(), name='project_search'),
    path('projects/statistics/', ProjectStatisticsView.as_view(), name='project_statistics'),
    
    # Enhanced index management
    path('rag/rebuild-enhanced/', RebuildEnhancedIndexView.as_view(), name='rebuild_enhanced_index'),
]
