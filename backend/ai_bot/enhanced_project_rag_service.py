"""
Enhanced Project RAG Service for comprehensive project-related searches
"""
import os
from typing import Any, Dict, List, Tuple, Optional
from django.db import connection
from sentence_transformers import SentenceTransformer
from .models import DocEmbedding

# Safe imports
try:
    from authentication.models import Project
except Exception:
    Project = None

try:
    from safetyobservation.models import SafetyObservation
except Exception:
    SafetyObservation = None

try:
    from incidentmanagement.models import Incident
except Exception:
    Incident = None

try:
    from ptw.models import Permit
except Exception:
    Permit = None

try:
    from worker.models import Worker
except Exception:
    Worker = None

try:
    from manpower.models import ManpowerEntry
except Exception:
    ManpowerEntry = None

class EnhancedProjectRAGService:
    """Enhanced RAG service specifically for comprehensive project searches"""
    
    def __init__(self):
        model_name = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
        self.model = SentenceTransformer(model_name)
        
    def _get_comprehensive_project_data(self, project_id: int) -> Dict[str, Any]:
        """Get all data related to a specific project"""
        project_data = {}
        
        if Project:
            try:
                project = Project.objects.get(id=project_id)
                project_data['project'] = {
                    'id': project.id,
                    'name': project.projectName,
                    'category': project.projectCategory,
                    'location': project.location,
                    'capacity': project.capacity,
                    'police_station': project.nearestPoliceStation,
                    'hospital': project.nearestHospital,
                    'start_date': str(project.commencementDate),
                    'deadline': str(project.deadlineDate),
                }
            except Project.DoesNotExist:
                return {}
        
        # Get related safety observations
        if SafetyObservation:
            safety_obs = SafetyObservation.objects.filter(
                project_id=project_id
            ).values('id', 'observationID', 'severity', 'observationStatus', 'department')[:50]
            project_data['safety_observations'] = list(safety_obs)
        
        # Get related incidents
        if Incident:
            incidents = Incident.objects.filter(
                project_id=project_id
            ).values('id', 'title', 'status', 'department', 'location')[:50]
            project_data['incidents'] = list(incidents)
        
        # Get related permits
        if Permit:
            permits = Permit.objects.filter(
                project_id=project_id
            ).values('id', 'permit_number', 'status', 'location', 'title')[:50]
            project_data['permits'] = list(permits)
        
        # Get related workers
        if Worker:
            workers = Worker.objects.filter(
                project_id=project_id
            ).values('id', 'name', 'department', 'designation', 'status')[:100]
            project_data['workers'] = list(workers)
        
        # Get manpower data
        if ManpowerEntry:
            manpower = ManpowerEntry.objects.filter(
                project_id=project_id
            ).values('id', 'date', 'category', 'count', 'shift')[:50]
            project_data['manpower'] = list(manpower)
        
        return project_data
    
    def _create_enhanced_project_embeddings(self, project_id: int) -> List[Tuple[str, str, str]]:
        """Create comprehensive embeddings for a project"""
        project_data = self._get_comprehensive_project_data(project_id)
        
        if not project_data:
            return []
        
        embeddings = []
        project_info = project_data.get('project', {})
        
        # Main project information
        main_text = f"Project {project_info.get('name', '')} Category {project_info.get('category', '')} Location {project_info.get('location', '')} Capacity {project_info.get('capacity', '')} Police {project_info.get('police_station', '')} Hospital {project_info.get('hospital', '')} Start {project_info.get('start_date', '')} Deadline {project_info.get('deadline', '')}"
        embeddings.append((project_info.get('name', ''), main_text, 'project_main'))
        
        # Safety observations summary
        safety_obs = project_data.get('safety_observations', [])
        if safety_obs:
            safety_text = f"Project {project_info.get('name', '')} Safety Observations: {len(safety_obs)} total. "
            for obs in safety_obs[:10]:  # Top 10
                safety_text += f"Obs {obs.get('observationID', '')} Severity {obs.get('severity', '')} Status {obs.get('observationStatus', '')} Dept {obs.get('department', '')}. "
            embeddings.append((f"{project_info.get('name', '')} Safety", safety_text, 'project_safety'))
        
        # Incidents summary
        incidents = project_data.get('incidents', [])
        if incidents:
            incident_text = f"Project {project_info.get('name', '')} Incidents: {len(incidents)} total. "
            for inc in incidents[:10]:
                incident_text += f"Incident {inc.get('title', '')} Status {inc.get('status', '')} Dept {inc.get('department', '')} Location {inc.get('location', '')}. "
            embeddings.append((f"{project_info.get('name', '')} Incidents", incident_text, 'project_incidents'))
        
        # Permits summary
        permits = project_data.get('permits', [])
        if permits:
            permit_text = f"Project {project_info.get('name', '')} Permits: {len(permits)} total. "
            for permit in permits[:10]:
                permit_text += f"Permit {permit.get('permit_number', '')} Status {permit.get('status', '')} Location {permit.get('location', '')}. "
            embeddings.append((f"{project_info.get('name', '')} Permits", permit_text, 'project_permits'))
        
        # Workers summary
        workers = project_data.get('workers', [])
        if workers:
            worker_text = f"Project {project_info.get('name', '')} Workers: {len(workers)} total. "
            dept_counts = {}
            for worker in workers:
                dept = worker.get('department', 'Unknown')
                dept_counts[dept] = dept_counts.get(dept, 0) + 1
            for dept, count in dept_counts.items():
                worker_text += f"{dept}: {count} workers. "
            embeddings.append((f"{project_info.get('name', '')} Workers", worker_text, 'project_workers'))
        
        # Manpower summary
        manpower = project_data.get('manpower', [])
        if manpower:
            manpower_text = f"Project {project_info.get('name', '')} Manpower: {len(manpower)} entries. "
            total_count = sum(entry.get('count', 0) for entry in manpower)
            manpower_text += f"Total headcount: {total_count}. "
            embeddings.append((f"{project_info.get('name', '')} Manpower", manpower_text, 'project_manpower'))
        
        return embeddings
    
    def search_projects_comprehensive(self, query: str, top_k: int = 10) -> Dict[str, Any]:
        """Comprehensive project search with enhanced results"""
        
        # First, get semantic matches from embeddings
        q_emb = self.model.encode([query], convert_to_numpy=True)[0].tolist()
        
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT module, record_id, title, chunk, 1 - (embedding <#> %s::vector) AS score
                FROM ai_bot_docembedding
                WHERE module LIKE 'project%'
                ORDER BY embedding <#> %s::vector ASC
                LIMIT %s
                """,
                [q_emb, q_emb, top_k * 2]
            )
            rows = cur.fetchall()
        
        # Group results by project
        project_results = {}
        for module, record_id, title, chunk, score in rows:
            if record_id not in project_results:
                project_results[record_id] = {
                    'project_id': record_id,
                    'title': title,
                    'chunks': [],
                    'max_score': 0,
                    'total_score': 0
                }
            
            project_results[record_id]['chunks'].append({
                'module': module,
                'snippet': chunk[:200] + '...' if len(chunk) > 200 else chunk,
                'score': round(float(score), 4)
            })
            project_results[record_id]['max_score'] = max(
                project_results[record_id]['max_score'], 
                float(score)
            )
            project_results[record_id]['total_score'] += float(score)
        
        # Sort by relevance
        sorted_projects = sorted(
            project_results.values(),
            key=lambda x: (x['max_score'], x['total_score']),
            reverse=True
        )[:top_k]
        
        # Enhance with comprehensive project data
        enhanced_results = []
        for project_result in sorted_projects:
            project_data = self._get_comprehensive_project_data(project_result['project_id'])
            if project_data:
                enhanced_result = {
                    **project_result,
                    'comprehensive_data': project_data,
                    'summary': self._generate_project_summary(project_data, query)
                }
                enhanced_results.append(enhanced_result)
        
        return {
            'type': 'enhanced_project_results',
            'query': query,
            'total_projects': len(enhanced_results),
            'projects': enhanced_results
        }
    
    def _generate_project_summary(self, project_data: Dict[str, Any], query: str) -> str:
        """Generate a contextual summary based on the query"""
        project_info = project_data.get('project', {})
        summary = f"Project: {project_info.get('name', 'Unknown')}"
        
        # Add relevant context based on query
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['safety', 'observation', 'hazard', 'risk']):
            safety_count = len(project_data.get('safety_observations', []))
            summary += f" | Safety Observations: {safety_count}"
        
        if any(word in query_lower for word in ['incident', 'accident', 'emergency']):
            incident_count = len(project_data.get('incidents', []))
            summary += f" | Incidents: {incident_count}"
        
        if any(word in query_lower for word in ['permit', 'ptw', 'work permit']):
            permit_count = len(project_data.get('permits', []))
            summary += f" | Permits: {permit_count}"
        
        if any(word in query_lower for word in ['worker', 'manpower', 'staff', 'employee']):
            worker_count = len(project_data.get('workers', []))
            manpower_total = sum(entry.get('count', 0) for entry in project_data.get('manpower', []))
            summary += f" | Workers: {worker_count} | Total Manpower: {manpower_total}"
        
        return summary
