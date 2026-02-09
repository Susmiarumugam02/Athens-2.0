"""
Intelligent AI Service with Deep Semantic Understanding
Like DeepSeek - provides contextual suggestions and deep search
"""

from typing import Dict, List, Any, Optional, Tuple
from django.db.models import Count, Q, Avg, Sum, Max, Min
from django.utils import timezone
from datetime import datetime, timedelta
import re
from difflib import SequenceMatcher

# Import models with safe handling
try:
    from authentication.models import CustomUser, Project, Notification
    from authentication.models_attendance import Attendance
except ImportError:
    CustomUser = Project = Notification = Attendance = None

try:
    from incidentmanagement.models import Incident
except ImportError:
    Incident = None

try:
    from safetyobservation.models import SafetyObservation, SafetyObservationFile
except ImportError:
    SafetyObservation = SafetyObservationFile = None

try:
    from ptw.models import Permit
except ImportError:
    Permit = None

try:
    from worker.models import Worker
except ImportError:
    Worker = None

try:
    from inductiontraining.models import InductionTraining
except ImportError:
    InductionTraining = None

try:
    from jobtraining.models import JobTraining
except ImportError:
    JobTraining = None

try:
    from tbt.models import ToolboxTalk
except ImportError:
    ToolboxTalk = None

try:
    from mom.models import Mom, ParticipantResponse
except ImportError:
    Mom = ParticipantResponse = None

try:
    from chatbox.models import ChatMessage
except ImportError:
    ChatMessage = None

try:
    from manpower.models import ManpowerEntry, WorkType, DailyManpowerSummary
except ImportError:
    ManpowerEntry = WorkType = DailyManpowerSummary = None

class IntelligentAIService:
    """Advanced AI with semantic understanding and contextual suggestions"""
    
    def __init__(self):
        # Knowledge base for semantic understanding
        self.knowledge_base = {
            'manpower': {
                'synonyms': ['workforce', 'staff', 'employees', 'workers', 'personnel', 'human resources', 'team', 'crew', 'labor', 'headcount'],
                'related_terms': ['attendance', 'shift', 'overtime', 'productivity', 'efficiency', 'work hours', 'daily summary'],
                'context_keywords': ['count', 'present', 'absent', 'late', 'half day', 'day shift', 'night shift', 'category', 'gender'],
                'questions': [
                    'How many workers are present today?',
                    'Show me manpower statistics',
                    'What is the attendance rate?',
                    'How many overtime hours this week?',
                    'Show workforce by category',
                    'Daily manpower summary'
                ]
            },
            'safety': {
                'synonyms': ['security', 'protection', 'hazard', 'risk', 'danger', 'unsafe', 'accident prevention'],
                'related_terms': ['observation', 'incident', 'severity', 'corrective action', 'PPE', 'safety measures'],
                'context_keywords': ['high severity', 'critical', 'open', 'closed', 'department', 'location'],
                'questions': [
                    'Show high severity safety observations',
                    'What are the recent safety issues?',
                    'Safety statistics by department',
                    'Open safety observations'
                ]
            },
            'incident': {
                'synonyms': ['accident', 'emergency', 'mishap', 'occurrence', 'event', 'problem', 'issue'],
                'related_terms': ['investigation', 'root cause', 'cost impact', '8D process', 'corrective action'],
                'context_keywords': ['open', 'closed', 'pending', 'investigation', 'cost', 'severity'],
                'questions': [
                    'Show open incidents',
                    'Incident cost analysis',
                    'Recent accidents',
                    'Incidents by department'
                ]
            },
            'permit': {
                'synonyms': ['ptw', 'work permit', 'authorization', 'clearance', 'approval', 'permission'],
                'related_terms': ['hot work', 'confined space', 'electrical work', 'height work', 'excavation'],
                'context_keywords': ['pending', 'approved', 'expired', 'draft', 'active'],
                'questions': [
                    'Show pending permits',
                    'Active work permits',
                    'Expired permits',
                    'Permits by type'
                ]
            },
            'training': {
                'synonyms': ['education', 'learning', 'course', 'instruction', 'development', 'skill building'],
                'related_terms': ['induction', 'job training', 'toolbox talk', 'certification', 'completion'],
                'context_keywords': ['completed', 'pending', 'scheduled', 'trainer', 'topic'],
                'questions': [
                    'Training completion rates',
                    'Pending training sessions',
                    'Training by department',
                    'Certification status'
                ]
            }
        }
        
        # Common industry terms and their meanings
        self.industry_terms = {
            'ppe': 'Personal Protective Equipment',
            'ptw': 'Permit to Work',
            'mom': 'Minutes of Meeting',
            'tbt': 'Toolbox Talk',
            'loto': 'Lock Out Tag Out',
            'jsa': 'Job Safety Analysis',
            'sop': 'Standard Operating Procedure',
            'hse': 'Health Safety Environment',
            'ehs': 'Environment Health Safety'
        }
    
    def process_intelligent_query(self, query: str, user_id: int) -> Dict[str, Any]:
        """Process query with deep semantic understanding"""
        query_lower = query.lower().strip()
        
        # Step 1: Understand intent and context
        intent_analysis = self._analyze_intent(query_lower)
        
        # Step 2: Perform semantic search
        search_results = self._semantic_search(query_lower, intent_analysis)
        
        # Step 3: Generate contextual suggestions
        suggestions = self._generate_contextual_suggestions(query_lower, intent_analysis, search_results)
        
        # Step 4: Format intelligent response
        return self._format_intelligent_response(query, intent_analysis, search_results, suggestions)
    
    def _analyze_intent(self, query: str) -> Dict[str, Any]:
        """Analyze user intent with semantic understanding"""
        intent = {
            'primary_domain': None,
            'confidence': 0.0,
            'action_type': 'search',
            'time_context': None,
            'filters': {},
            'semantic_matches': [],
            'understood_domain': 'general'
        }
        
        # Handle dashboard queries
        if any(word in query for word in ['dashboard', 'overview', 'statistics', 'stats', 'summary']):
            intent['primary_domain'] = 'dashboard'
            intent['confidence'] = 0.9
            intent['action_type'] = 'analyze'
            intent['understood_domain'] = 'dashboard'
            return intent
        
        # Handle safety queries
        if any(word in query for word in ['safety', 'observation', 'hazard', 'risk']):
            intent['primary_domain'] = 'safety'
            intent['confidence'] = 0.8
            intent['understood_domain'] = 'safety'
        
        # Handle manpower queries
        if any(word in query for word in ['manpower', 'worker', 'staff', 'employee', 'attendance']):
            intent['primary_domain'] = 'manpower'
            intent['confidence'] = 0.8
            intent['understood_domain'] = 'manpower'
        
        # Handle incident queries
        if any(word in query for word in ['incident', 'accident', 'emergency']):
            intent['primary_domain'] = 'incident'
            intent['confidence'] = 0.8
            intent['understood_domain'] = 'incident'
        
        # Handle permit queries
        if any(word in query for word in ['permit', 'ptw', 'authorization']):
            intent['primary_domain'] = 'permit'
            intent['confidence'] = 0.8
            intent['understood_domain'] = 'permit'
        
        # Determine action type
        if any(word in query for word in ['how many', 'count', 'total', 'number']):
            intent['action_type'] = 'count'
        elif any(word in query for word in ['show', 'display', 'list', 'get']):
            intent['action_type'] = 'search'
        elif any(word in query for word in ['overview', 'dashboard', 'summary']):
            intent['action_type'] = 'analyze'
        
        # Time context
        if any(word in query for word in ['today', 'current']):
            intent['time_context'] = 'today'
        elif any(word in query for word in ['week', 'weekly']):
            intent['time_context'] = 'week'
        
        return intent
    
    def _semantic_search(self, query: str, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Perform semantic search based on intent"""
        results = {
            'total_results': 0,
            'results': [],
            'domain_breakdown': {},
            'suggestions': []
        }
        
        primary_domain = intent.get('primary_domain')
        
        # Handle dashboard overview requests
        if primary_domain == 'dashboard':
            return self._get_dashboard_overview()
        elif primary_domain == 'manpower':
            results.update(self._search_manpower_semantic(query, intent))
        elif primary_domain == 'safety':
            results.update(self._search_safety_semantic(query, intent))
        elif primary_domain == 'incident':
            results.update(self._search_incident_semantic(query, intent))
        elif primary_domain == 'permit':
            results.update(self._search_permit_semantic(query, intent))
        else:
            # Provide general help
            results = {
                'total_results': 0,
                'results': [],
                'domain_breakdown': {},
                'suggestions': [
                    'Try "dashboard overview"',
                    'Try "safety observations"', 
                    'Try "manpower today"',
                    'Try "recent incidents"',
                    'Try "pending permits"'
                ]
            }
        
        return results
    
    def _search_manpower_semantic(self, query: str, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Semantic search for manpower data"""
        results = {'results': [], 'total_results': 0, 'domain_breakdown': {'manpower': 0}}
        
        if not ManpowerEntry:
            return results
        
        try:
            # Build query based on intent
            queryset = ManpowerEntry.objects.all()
            
            # Apply time filters
            if intent.get('time_context') == 'today':
                queryset = queryset.filter(date=timezone.now().date())
            elif intent.get('time_context') == 'week':
                week_ago = timezone.now().date() - timedelta(days=7)
                queryset = queryset.filter(date__gte=week_ago)
            elif intent.get('time_context') == 'recent':
                recent = timezone.now().date() - timedelta(days=30)
                queryset = queryset.filter(date__gte=recent)
            
            # Search in relevant fields
            search_terms = query.split()
            q_objects = Q()
            
            for term in search_terms:
                q_objects |= (
                    Q(category__icontains=term) |
                    Q(work_type__name__icontains=term) |
                    Q(notes__icontains=term) |
                    Q(shift__icontains=term) |
                    Q(attendance_status__icontains=term)
                )
            
            entries = queryset.filter(q_objects).order_by('-date')[:10]
            
            # Format results
            for entry in entries:
                results['results'].append({
                    'module': 'manpower',
                    'type': 'Manpower Entry',
                    'id': entry.id,
                    'title': f"{entry.category} - {entry.gender} ({entry.count} workers)",
                    'description': f"Date: {entry.date}, Shift: {entry.get_shift_display()}, Hours: {entry.hours_worked}",
                    'category': entry.category,
                    'count': entry.count,
                    'shift': entry.get_shift_display(),
                    'status': entry.get_attendance_status_display(),
                    'hours': float(entry.hours_worked) if entry.hours_worked else 0,
                    'overtime': float(entry.overtime_hours) if entry.overtime_hours else 0,
                    'date': entry.date.strftime('%Y-%m-%d'),
                    'work_type': entry.work_type.name if entry.work_type else 'General'
                })
            
            results['total_results'] = len(results['results'])
            results['domain_breakdown']['manpower'] = results['total_results']
            
            # Add summary statistics if action is analyze
            if intent.get('action_type') == 'analyze':
                summary = self._get_manpower_analytics(queryset)
                results['analytics'] = summary
        
        except Exception as e:


        
            pass
        
            pass
        
        return results
    
    def _get_manpower_analytics(self, queryset) -> Dict[str, Any]:
        """Get manpower analytics"""
        try:
            total_entries = queryset.count()
            total_workers = queryset.aggregate(Sum('count'))['count__sum'] or 0
            avg_hours = queryset.aggregate(Avg('hours_worked'))['hours_worked__avg'] or 0
            total_overtime = queryset.aggregate(Sum('overtime_hours'))['overtime_hours__sum'] or 0
            
            # Category breakdown
            category_breakdown = queryset.values('category').annotate(
                total_count=Sum('count'),
                avg_hours=Avg('hours_worked')
            ).order_by('-total_count')
            
            return {
                'total_entries': total_entries,
                'total_workers': total_workers,
                'average_hours': round(float(avg_hours), 2),
                'total_overtime': float(total_overtime),
                'category_breakdown': list(category_breakdown)
            }
        except:
            return {}
    
    def _search_safety_semantic(self, query: str, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Semantic search for safety data"""
        results = {'results': [], 'total_results': 0, 'domain_breakdown': {'safety': 0}}
        
        if not SafetyObservation:
            return results
        
        try:
            queryset = SafetyObservation.objects.all()
            
            # Apply filters based on query content
            if any(word in query for word in ['high', 'critical', 'severe']):
                queryset = queryset.filter(severity__gte=3)
            
            if any(word in query for word in ['open', 'pending']):
                queryset = queryset.filter(observationStatus='open')
            
            # Search in relevant fields
            search_terms = query.split()
            q_objects = Q()
            
            for term in search_terms:
                q_objects |= (
                    Q(observationID__icontains=term) |
                    Q(safetyObservationFound__icontains=term) |
                    Q(department__icontains=term) |
                    Q(workLocation__icontains=term) |
                    Q(activityPerforming__icontains=term) |
                    Q(correctivePreventiveAction__icontains=term)
                )
            
            observations = queryset.filter(q_objects).order_by('-created_at')[:10]
            
            for obs in observations:
                results['results'].append({
                    'module': 'safety',
                    'type': 'Safety Observation',
                    'id': obs.id,
                    'title': obs.observationID,
                    'description': obs.safetyObservationFound[:100] + '...' if len(obs.safetyObservationFound) > 100 else obs.safetyObservationFound,
                    'severity': obs.get_severity_display(),
                    'status': obs.get_observationStatus_display(),
                    'department': obs.department,
                    'location': obs.workLocation,
                    'risk_score': obs.riskScore,
                    'date': obs.created_at.strftime('%Y-%m-%d %H:%M') if obs.created_at else 'N/A'
                })
            
            results['total_results'] = len(results['results'])
            results['domain_breakdown']['safety'] = results['total_results']
        
        except Exception as e:


        
            pass
        
            pass
        
        return results
    
    def _universal_semantic_search(self, query: str, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Universal semantic search across all modules"""
        results = {'results': [], 'total_results': 0, 'domain_breakdown': {}}
        
        # Search each module with semantic understanding
        for domain in self.knowledge_base.keys():
            if domain == 'manpower':
                domain_results = self._search_manpower_semantic(query, intent)
            elif domain == 'safety':
                domain_results = self._search_safety_semantic(query, intent)
            # Add other domains as needed
            else:
                continue
            
            results['results'].extend(domain_results.get('results', []))
            results['domain_breakdown'].update(domain_results.get('domain_breakdown', {}))
        
        results['total_results'] = len(results['results'])
        return results
    
    def _generate_contextual_suggestions(self, query: str, intent: Dict[str, Any], search_results: Dict[str, Any]) -> List[str]:
        """Generate intelligent contextual suggestions"""
        suggestions = []
        
        primary_domain = intent.get('primary_domain')
        
        if primary_domain and primary_domain in self.knowledge_base:
            # Add domain-specific questions
            domain_questions = self.knowledge_base[primary_domain]['questions']
            suggestions.extend(domain_questions[:3])
        
        # Add suggestions based on search results
        if search_results['total_results'] > 0:
            suggestions.append("Filter results by date range")
            suggestions.append("Get detailed analytics")
            suggestions.append("Export results to report")
        else:
            # No results - suggest alternatives
            if primary_domain:
                related_terms = self.knowledge_base[primary_domain]['related_terms']
                suggestions.extend([f"Try searching for '{term}'" for term in related_terms[:3]])
            else:
                suggestions.extend([
                    "Try 'manpower statistics'",
                    "Try 'safety observations'",
                    "Try 'recent incidents'"
                ])
        
        return suggestions[:5]
    
    def _format_intelligent_response(self, query: str, intent: Dict[str, Any], search_results: Dict[str, Any], suggestions: List[str]) -> Dict[str, Any]:
        """Format intelligent response with context"""
        
        if search_results['total_results'] == 0:
            return {
                'type': 'intelligent_no_results',
                'message': f'🤔 I understand you\'re looking for information about "{query}"',
                'intent_analysis': {
                    'understood_domain': intent.get('primary_domain', 'general'),
                    'confidence': intent.get('confidence', 0.0),
                    'action_type': intent.get('action_type', 'search')
                },
                'suggestions': suggestions,
                'alternative_queries': self._get_alternative_queries(query, intent)
            }
        
        return {
            'type': 'intelligent_results',
            'message': f'🎯 Found {search_results["total_results"]} results for "{query}"',
            'intent_analysis': {
                'understood_domain': intent.get('primary_domain', 'general'),
                'confidence': intent.get('confidence', 0.0),
                'semantic_matches': intent.get('semantic_matches', [])
            },
            'data': search_results,
            'suggestions': suggestions,
            'analytics': search_results.get('analytics', {})
        }
    
    def _get_alternative_queries(self, query: str, intent: Dict[str, Any]) -> List[str]:
        """Get alternative query suggestions"""
        alternatives = []
        
        primary_domain = intent.get('primary_domain')
        if primary_domain and primary_domain in self.knowledge_base:
            # Suggest synonyms
            synonyms = self.knowledge_base[primary_domain]['synonyms']
            for synonym in synonyms[:2]:
                alternatives.append(f"Try '{synonym}' instead of '{primary_domain}'")
        
        return alternatives
    
    def _calculate_similarity(self, term: str, query: str) -> float:
        """Calculate similarity between term and query"""
        return SequenceMatcher(None, term, query).ratio()
    
    # Additional search methods for other domains would go here...
    def _search_incident_semantic(self, query: str, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Placeholder for incident semantic search"""
        return {'results': [], 'total_results': 0, 'domain_breakdown': {'incident': 0}}
    
    def _search_permit_semantic(self, query: str, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Placeholder for permit semantic search"""
        return {'results': [], 'total_results': 0, 'domain_breakdown': {'permit': 0}}
    
    def _get_dashboard_overview(self) -> Dict[str, Any]:
        """Get comprehensive dashboard overview"""
        try:
            stats = {}
            
            # Safety statistics
            if SafetyObservation:
                safety_count = SafetyObservation.objects.count()
                high_severity = SafetyObservation.objects.filter(severity__gte=3).count()
                stats['safety'] = {
                    'total_observations': safety_count,
                    'high_severity': high_severity,
                    'open_observations': SafetyObservation.objects.filter(observationStatus='open').count()
                }
            
            # Worker statistics
            if Worker:
                worker_count = Worker.objects.count()
                active_workers = Worker.objects.filter(employment_status='deployed').count()
                stats['workers'] = {
                    'total_workers': worker_count,
                    'active_workers': active_workers,
                    'initiated_workers': Worker.objects.filter(employment_status='initiated').count()
                }
            
            # Incident statistics
            if Incident:
                incident_count = Incident.objects.count()
                open_incidents = Incident.objects.filter(status='open').count()
                stats['incidents'] = {
                    'total_incidents': incident_count,
                    'open_incidents': open_incidents,
                    'closed_incidents': incident_count - open_incidents
                }
            
            # Permit statistics
            if Permit:
                permit_count = Permit.objects.count()
                pending_permits = Permit.objects.filter(status__in=['submitted', 'under_review']).count()
                stats['permits'] = {
                    'total_permits': permit_count,
                    'pending_permits': pending_permits,
                    'active_permits': Permit.objects.filter(status='approved').count()
                }
            
            return {
                'type': 'comprehensive_dashboard',
                'message': '📊 Here\'s your complete dashboard overview',
                'data': stats,
                'suggestions': [
                    'Show high severity safety observations',
                    'Show open incidents',
                    'Show pending permits',
                    'Show worker statistics'
                ]
            }
        
        except Exception as e:
            return {
                'type': 'error',
                'message': 'Unable to generate dashboard overview at this time',
                'suggestions': ['Try specific queries like "safety observations"']
            }
