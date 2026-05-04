"""
Universal Database Search Service - Search any word across all database tables
"""
from django.db import connection
from django.apps import apps
from django.db.models import Q, Count, Sum, Avg
from typing import Dict, List, Any, Optional
import re
from datetime import datetime, timedelta

class UniversalSearchService:
    """Search any keyword across all database tables and return comprehensive results"""
    
    def __init__(self):
        self.searchable_models = self._get_searchable_models()
    
    def _get_searchable_models(self) -> Dict[str, Any]:
        """Get all models that can be searched"""
        models = {}
        
        # Define searchable models with their key fields
        model_configs = {
            'authentication.Project': {
                'name': 'Project',
                'fields': ['projectName', 'projectCategory', 'location', 'capacity', 'nearestPoliceStation', 'nearestHospital'],
                'display_field': 'projectName'
            },
            'safetyobservation.SafetyObservation': {
                'name': 'Safety Observation',
                'fields': ['observationID', 'safetyObservationFound', 'department', 'workLocation', 'severity', 'observationStatus'],
                'display_field': 'observationID'
            },
            'incidentmanagement.Incident': {
                'name': 'Incident',
                'fields': ['title', 'description', 'status', 'department', 'location', 'severity'],
                'display_field': 'title'
            },
            'ptw.Permit': {
                'name': 'Permit',
                'fields': ['permit_number', 'title', 'description', 'status', 'location', 'work_description'],
                'display_field': 'permit_number'
            },
            'worker.Worker': {
                'name': 'Worker',
                'fields': ['name', 'department', 'designation', 'status', 'employee_id', 'contact_number'],
                'display_field': 'name'
            },
            'manpower.ManpowerEntry': {
                'name': 'Manpower Entry',
                'fields': ['category', 'gender', 'shift', 'notes', 'attendance_status'],
                'display_field': 'category',
                'count_field': 'count'
            },
            'mom.Mom': {
                'name': 'Meeting',
                'fields': ['title', 'agenda', 'status', 'department', 'location', 'meeting_type'],
                'display_field': 'title'
            },
            'inductiontraining.InductionTraining': {
                'name': 'Induction Training',
                'fields': ['title', 'description', 'location', 'conducted_by', 'status'],
                'display_field': 'title'
            },
            'jobtraining.JobTraining': {
                'name': 'Job Training',
                'fields': ['title', 'description', 'location', 'conducted_by', 'status'],
                'display_field': 'title'
            }
        }
        
        # Get actual model classes
        for model_path, config in model_configs.items():
            try:
                app_label, model_name = model_path.split('.')
                model_class = apps.get_model(app_label, model_name)
                models[model_path] = {
                    'model': model_class,
                    'config': config
                }
            except:
                continue
        
        return models
    
    def search_everywhere(self, query: str, limit_per_model: int = 10) -> Dict[str, Any]:
        """Search for a keyword across all database tables"""
        query = query.strip().lower()
        if not query:
            return {'results': [], 'total_count': 0, 'search_query': query}
        
        all_results = []
        total_count = 0
        model_breakdown = {}
        
        for model_path, model_info in self.searchable_models.items():
            try:
                model_class = model_info['model']
                config = model_info['config']
                
                # Build search query for this model
                search_q = Q()
                for field in config['fields']:
                    search_q |= Q(**{f"{field}__icontains": query})
                
                # Execute search
                results = model_class.objects.filter(search_q)[:limit_per_model]
                
                # Format results
                model_results = []
                for obj in results:
                    result_data = {
                        'model': config['name'],
                        'model_key': model_path,
                        'id': obj.id,
                        'title': str(getattr(obj, config['display_field'], 'N/A')),
                        'matched_fields': {},
                        'additional_info': {}
                    }
                    
                    # Find which fields matched
                    for field in config['fields']:
                        try:
                            field_value = str(getattr(obj, field, ''))
                            if query in field_value.lower():
                                result_data['matched_fields'][field] = field_value
                        except:
                            continue
                    
                    # Add special handling for manpower (count field)
                    if 'count_field' in config:
                        try:
                            count_value = getattr(obj, config['count_field'], 0)
                            result_data['additional_info']['count'] = count_value
                        except:
                            pass
                    
                    # Add date if available
                    for date_field in ['date', 'created_at', 'commencementDate']:
                        try:
                            date_value = getattr(obj, date_field, None)
                            if date_value:
                                result_data['additional_info']['date'] = str(date_value)
                                break
                        except:
                            continue
                    
                    model_results.append(result_data)
                
                if model_results:
                    all_results.extend(model_results)
                    model_breakdown[config['name']] = len(model_results)
                    total_count += len(model_results)
                    
            except Exception as e:
                continue
        
        return {
            'results': all_results,
            'total_count': total_count,
            'model_breakdown': model_breakdown,
            'search_query': query
        }
    
    def get_manpower_intelligence(self, query: str) -> Dict[str, Any]:
        """Intelligent manpower analysis and counting"""
        try:
            from manpower.models import ManpowerEntry
            
            # Determine what user is asking about
            query_lower = query.lower()
            
            # Time-based queries
            today = datetime.now().date()
            
            if any(word in query_lower for word in ['today', 'current', 'now']):
                entries = ManpowerEntry.objects.filter(date=today)
                time_context = "today"
            elif any(word in query_lower for word in ['yesterday']):
                yesterday = today - timedelta(days=1)
                entries = ManpowerEntry.objects.filter(date=yesterday)
                time_context = "yesterday"
            elif any(word in query_lower for word in ['week', 'weekly']):
                week_ago = today - timedelta(days=7)
                entries = ManpowerEntry.objects.filter(date__gte=week_ago)
                time_context = "this week"
            elif any(word in query_lower for word in ['month', 'monthly']):
                month_ago = today - timedelta(days=30)
                entries = ManpowerEntry.objects.filter(date__gte=month_ago)
                time_context = "this month"
            else:
                # Recent entries (last 7 days)
                week_ago = today - timedelta(days=7)
                entries = ManpowerEntry.objects.filter(date__gte=week_ago)
                time_context = "recent (last 7 days)"
            
            # Calculate totals
            total_count = entries.aggregate(total=Sum('count'))['total'] or 0
            total_entries = entries.count()
            
            # Category breakdown
            category_breakdown = entries.values('category').annotate(
                total_workers=Sum('count'),
                entries_count=Count('id')
            ).order_by('-total_workers')
            
            # Gender breakdown
            gender_breakdown = entries.values('gender').annotate(
                total_workers=Sum('count')
            ).order_by('-total_workers')
            
            # Shift breakdown
            shift_breakdown = entries.values('shift').annotate(
                total_workers=Sum('count')
            ).order_by('-total_workers')
            
            # Daily breakdown (for time periods)
            daily_breakdown = entries.values('date').annotate(
                total_workers=Sum('count')
            ).order_by('-date')[:7]  # Last 7 days
            
            # Generate intelligent response
            response_parts = []
            
            if total_count > 0:
                response_parts.append(f"**Total Manpower {time_context}: {total_count} workers**")
                response_parts.append(f"📊 Based on {total_entries} manpower entries")
                
                if category_breakdown:
                    response_parts.append("\n**👥 By Category:**")
                    for cat in category_breakdown[:5]:  # Top 5
                        response_parts.append(f"• {cat['category']}: {cat['total_workers']} workers ({cat['entries_count']} entries)")
                
                if gender_breakdown:
                    response_parts.append("\n**⚧ By Gender:**")
                    for gender in gender_breakdown:
                        response_parts.append(f"• {gender['gender']}: {gender['total_workers']} workers")
                
                if shift_breakdown and len(shift_breakdown) > 1:
                    response_parts.append("\n**🕐 By Shift:**")
                    for shift in shift_breakdown:
                        shift_name = dict(ManpowerEntry.SHIFT_CHOICES).get(shift['shift'], shift['shift'])
                        response_parts.append(f"• {shift_name}: {shift['total_workers']} workers")
                
                if daily_breakdown and len(daily_breakdown) > 1:
                    response_parts.append("\n**📅 Daily Breakdown:**")
                    for day in daily_breakdown[:5]:
                        response_parts.append(f"• {day['date']}: {day['total_workers']} workers")
            else:
                response_parts.append(f"No manpower data found for {time_context}")
            
            return {
                'type': 'manpower_intelligence',
                'answer': '\n'.join(response_parts),
                'data': {
                    'total_count': total_count,
                    'total_entries': total_entries,
                    'time_context': time_context,
                    'category_breakdown': list(category_breakdown),
                    'gender_breakdown': list(gender_breakdown),
                    'shift_breakdown': list(shift_breakdown),
                    'daily_breakdown': list(daily_breakdown)
                }
            }
            
        except Exception as e:
            return {
                'type': 'manpower_intelligence',
                'answer': f"Unable to retrieve manpower data: {str(e)}",
                'data': {}
            }
    
    def intelligent_search(self, query: str) -> Dict[str, Any]:
        """Intelligent search that understands context and provides smart responses"""
        query_lower = query.lower()
        
        # Check if it's a manpower-related query
        manpower_keywords = [
            'manpower', 'workers', 'workforce', 'headcount', 'staff', 'employees',
            'attendance', 'count', 'total people', 'how many', 'personnel'
        ]
        
        if any(keyword in query_lower for keyword in manpower_keywords):
            return self.get_manpower_intelligence(query)
        
        # Otherwise, do universal search
        search_results = self.search_everywhere(query)
        
        if search_results['total_count'] > 0:
            # Format intelligent response
            answer_parts = [
                f"🔍 **Found {search_results['total_count']} results for '{query}'**",
                ""
            ]
            
            # Add model breakdown
            if search_results['model_breakdown']:
                answer_parts.append("📊 **Results by module:**")
                for model_name, count in search_results['model_breakdown'].items():
                    answer_parts.append(f"• {model_name}: {count} matches")
                answer_parts.append("")
            
            # Add top results
            answer_parts.append("📋 **Top Results:**")
            for i, result in enumerate(search_results['results'][:10], 1):
                title = result['title'][:50] + "..." if len(result['title']) > 50 else result['title']
                answer_parts.append(f"{i}. **{result['model']}**: {title}")
                
                # Show matched fields
                if result['matched_fields']:
                    for field, value in list(result['matched_fields'].items())[:2]:  # Show top 2 matches
                        short_value = value[:80] + "..." if len(value) > 80 else value
                        answer_parts.append(f"   📝 {field}: {short_value}")
                
                # Show additional info
                if result['additional_info']:
                    info_parts = []
                    if 'count' in result['additional_info']:
                        info_parts.append(f"Count: {result['additional_info']['count']}")
                    if 'date' in result['additional_info']:
                        info_parts.append(f"Date: {result['additional_info']['date']}")
                    if info_parts:
                        answer_parts.append(f"   ℹ️ {' | '.join(info_parts)}")
                
                answer_parts.append("")
            
            return {
                'type': 'universal_search_results',
                'answer': '\n'.join(answer_parts),
                'sources': search_results['results'],
                'total_count': search_results['total_count']
            }
        else:
            return {
                'type': 'no_results',
                'answer': f"No results found for '{query}' in the database. Try different keywords or check spelling.",
                'sources': [],
                'total_count': 0
            }
