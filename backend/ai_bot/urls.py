"""
URL configuration for AI Bot service
"""

from django.urls import path
from .views import AIQueryView, DashboardDataView, SearchView, TextSuggestionView, RAGQueryView, RAGReindexView

urlpatterns = [
    path('query/', AIQueryView.as_view(), name='ai_query'),
    path('dashboard/', DashboardDataView.as_view(), name='ai_dashboard'),
    path('search/', SearchView.as_view(), name='ai_search'),
    path('suggest/', TextSuggestionView.as_view(), name='ai_suggest'),
    path('rag/query/', RAGQueryView.as_view(), name='ai_rag_query'),
    path('rag/reindex/', RAGReindexView.as_view(), name='ai_rag_reindex'),
]
