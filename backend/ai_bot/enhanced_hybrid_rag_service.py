"""
Enhanced Hybrid RAG Service with improved project search capabilities
"""
import json
import http.client
from typing import Any, Dict, List, Tuple, Optional
from .vector_rag_service import VectorRAGService
from .rag_service import RAGService
from .enhanced_project_rag_service import EnhancedProjectRAGService

# Enhanced module keywords with more comprehensive project-related terms
ENHANCED_MODULE_KEYWORDS = {
    'safetyobservation': [
        'safety', 'observation', 'unsafe', 'ppe', 'risk', 'hazard', 'incident prevention',
        'safety violation', 'near miss', 'safety audit', 'safety inspection'
    ],
    'incident': [
        'incident', 'accident', 'mishap', 'emergency', 'injury', 'damage', 'near miss',
        'investigation', 'root cause', 'corrective action'
    ],
    'permit': [
        'permit', 'ptw', 'work permit', 'authorization', 'clearance', 'approval',
        'hot work', 'confined space', 'electrical work', 'height work'
    ],
    'worker': [
        'worker', 'employee', 'staff', 'personnel', 'contractor', 'subcontractor',
        'supervisor', 'foreman', 'technician', 'operator'
    ],
    'manpowerentry': [
        'manpower', 'attendance', 'headcount', 'workforce', 'shift', 'deployment',
        'resource allocation', 'staffing', 'crew'
    ],
    'mom': [
        'meeting', 'minutes', 'agenda', 'mom', 'discussion', 'action items',
        'follow up', 'decisions', 'coordination'
    ],
    'project': [
        'project', 'site', 'construction', 'facility', 'plant', 'installation',
        'development', 'infrastructure', 'building', 'structure', 'location',
        'capacity', 'deadline', 'completion', 'progress', 'milestone',
        'client', 'contractor', 'epc', 'scope', 'phase'
    ]
}

# Project-specific query patterns that should trigger enhanced project search
PROJECT_QUERY_PATTERNS = [
    'project overview', 'project status', 'project details', 'project information',
    'project progress', 'project summary', 'all projects', 'project list',
    'project statistics', 'project data', 'project report', 'project analysis',
    'site information', 'site details', 'facility information'
]

class EnhancedHybridRAGService:
    """Enhanced hybrid RAG service with specialized project search capabilities"""
    
    def __init__(self, vector_weight: float = 0.7, sparse_weight: float = 0.3):
        self.vector = VectorRAGService()
        self.sparse = RAGService()
        self.project_rag = EnhancedProjectRAGService()
        self.vector_weight = vector_weight
        self.sparse_weight = sparse_weight

    def _route_modules(self, query: str) -> Optional[List[str]]:
        """Enhanced module routing with better keyword matching"""
        q = query.lower()
        hits = []
        
        for module, kws in ENHANCED_MODULE_KEYWORDS.items():
            if any(k in q for k in kws):
                hits.append(module)
        
        return hits or None

    def _is_project_focused_query(self, query: str) -> bool:
        """Determine if query is specifically asking for project information"""
        q = query.lower()
        
        # Check for explicit project query patterns
        if any(pattern in q for pattern in PROJECT_QUERY_PATTERNS):
            return True
        
        # Check for project-specific keywords with high weight
        project_keywords = ENHANCED_MODULE_KEYWORDS['project']
        project_matches = sum(1 for kw in project_keywords if kw in q)
        
        # If more than 2 project keywords or specific project terms
        if project_matches >= 2:
            return True
        
        # Check for specific project-related questions
        project_question_patterns = [
            'what projects', 'which projects', 'how many projects',
            'project capacity', 'project location', 'project deadline',
            'project category', 'project type', 'project details'
        ]
        
        if any(pattern in q for pattern in project_question_patterns):
            return True
        
        return False

    def _merge_sources(self, v_sources: List[Dict[str, Any]], s_sources: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        """Enhanced source merging with better scoring"""
        scores: Dict[Tuple[str, int], float] = {}
        meta: Dict[Tuple[str, int], Dict[str, Any]] = {}
        
        # Process vector sources
        for src in v_sources:
            key = (src['module'], src['id'])
            base_score = float(src.get('score', 0))
            
            # Boost project-related results
            if src['module'].startswith('project'):
                base_score *= 1.2
            
            scores[key] = scores.get(key, 0.0) + self.vector_weight * base_score
            meta[key] = src
        
        # Process sparse sources
        for src in s_sources:
            key = (src['module'], src['id'])
            base_score = float(src.get('score', 0))
            
            # Boost project-related results
            if src['module'].startswith('project'):
                base_score *= 1.2
            
            scores[key] = scores.get(key, 0.0) + self.sparse_weight * base_score
            if key not in meta:
                meta[key] = src
        
        # Sort and return top results
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        out = []
        for (module, rid), sc in ranked:
            m = meta[(module, rid)].copy()
            m['score'] = round(sc, 4)
            out.append(m)
        
        return out

    def query(self, question: str, top_k: int = 8) -> Dict[str, Any]:
        """Enhanced query processing with project-specific handling"""
        
        # Check if this is a project-focused query
        if self._is_project_focused_query(question):
            # Use enhanced project search
            project_results = self.project_rag.search_projects_comprehensive(question, top_k)
            
            if project_results.get('projects'):
                # Format for consistent response structure
                sources = []
                for project in project_results['projects']:
                    sources.append({
                        'module': 'project',
                        'id': project['project_id'],
                        'title': project['title'],
                        'snippet': project['summary'],
                        'score': project['max_score'],
                        'comprehensive_data': project.get('comprehensive_data', {})
                    })
                
                answer = f"Found {len(sources)} project(s) matching your query. Here are the comprehensive results:"
                
                return {
                    'type': 'enhanced_project_results',
                    'answer': answer,
                    'sources': sources,
                    'missing_fields': [],
                    'project_focused': True
                }
        
        # Standard hybrid search for non-project-focused queries
        modules = self._route_modules(question)
        
        # Get results from both services
        v_res = self.vector.query(question, top_k=top_k, modules=modules)
        v_sources = v_res.get('sources', [])
        
        s_res = self.sparse.answer(question)
        s_sources = s_res.get('sources', []) if isinstance(s_res, dict) else []
        
        # Merge and rank sources
        sources = self._merge_sources(v_sources, s_sources, top_k)
        
        # Enhanced answer generation
        if not sources:
            answer = "Information not available in current database."
        else:
            # Check if results contain project data
            project_sources = [s for s in sources if s['module'] == 'project']
            
            if project_sources and len(project_sources) >= len(sources) * 0.5:
                # Majority are project results
                answer = f"Here are the most relevant project-related results from your data ({len(sources)} matches found)."
            else:
                answer = f"Here are the most relevant results from your data ({len(sources)} matches found)."
        
        return {
            'type': 'rag_results' if sources else 'rag_no_results',
            'answer': answer,
            'sources': sources,
            'missing_fields': s_res.get('missing_fields', []) if isinstance(s_res, dict) else [],
            'modules_detected': modules,
            'project_focused': False
        }

    def get_project_statistics(self) -> Dict[str, Any]:
        """Get comprehensive project statistics"""
        try:
            from authentication.models import Project
            from safetyobservation.models import SafetyObservation
            from incidentmanagement.models import Incident
            from ptw.models import Permit
            from worker.models import Worker
            
            stats = {}
            
            if Project:
                projects = Project.objects.all()
                stats['total_projects'] = projects.count()
                stats['project_categories'] = list(
                    projects.values_list('projectCategory', flat=True).distinct()
                )
            
            if SafetyObservation:
                stats['total_safety_observations'] = SafetyObservation.objects.count()
            
            if Incident:
                stats['total_incidents'] = Incident.objects.count()
            
            if Permit:
                stats['total_permits'] = Permit.objects.count()
            
            if Worker:
                stats['total_workers'] = Worker.objects.count()
            
            return stats
            
        except Exception as e:
            return {'error': str(e)}
