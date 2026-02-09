"""
Enhanced AI Service with NLP, Spell Correction, and EHS Domain Knowledge
"""

import re
import json
from typing import Dict, List, Any, Optional, Tuple
from difflib import SequenceMatcher, get_close_matches
from datetime import datetime, timedelta
from django.utils import timezone
from .ehs_standards_knowledge import EHSStandardsKnowledge
from .comprehensive_ehs_knowledge import ComprehensiveEHSKnowledge

class EHSKnowledgeBase:
    """EHS Domain Knowledge and Terminology"""
    
    def __init__(self):
        self.ehs_terminology = {
            # Safety Terms
            'ppe': 'Personal Protective Equipment',
            'ptw': 'Permit to Work',
            'loto': 'Lock Out Tag Out',
            'jsa': 'Job Safety Analysis',
            'sop': 'Standard Operating Procedure',
            'msds': 'Material Safety Data Sheet',
            'sds': 'Safety Data Sheet',
            'hse': 'Health Safety Environment',
            'ehs': 'Environment Health Safety',
            'osha': 'Occupational Safety and Health Administration',
            'hazmat': 'Hazardous Materials',
            'confined space': 'Enclosed area with limited entry/exit',
            'hot work': 'Work involving flames, sparks, or heat',
            'fall protection': 'Safety measures for working at height',
            'work at height': 'Any work where a person could fall and injure themselves',
            'scaffolding': 'Temporary structure for working at height',
            'harness': 'Personal fall protection equipment',
            'lanyard': 'Connecting device for fall protection',
            'anchor point': 'Secure attachment point for fall protection',
            
            # Environmental Terms
            'esg': 'Environmental Social Governance',
            'ghg': 'Greenhouse Gas',
            'co2': 'Carbon Dioxide',
            'voc': 'Volatile Organic Compounds',
            'bod': 'Biochemical Oxygen Demand',
            'cod': 'Chemical Oxygen Demand',
            'tds': 'Total Dissolved Solids',
            'ph': 'Potential of Hydrogen',
            'ppm': 'Parts Per Million',
            'ppb': 'Parts Per Billion',
            
            # Quality Terms
            'qms': 'Quality Management System',
            'iso': 'International Organization for Standardization',
            'qc': 'Quality Control',
            'qa': 'Quality Assurance',
            'ncr': 'Non-Conformance Report',
            'car': 'Corrective Action Request',
            'par': 'Preventive Action Request',
            'capa': 'Corrective and Preventive Action',
            
            # Incident Terms
            'ltir': 'Lost Time Injury Rate',
            'trir': 'Total Recordable Incident Rate',
            'mtc': 'Medical Treatment Case',
            'fac': 'First Aid Case',
            'near miss': 'Incident with potential for injury',
            'rca': 'Root Cause Analysis',
            '8d': 'Eight Disciplines Problem Solving',
            'fishbone': 'Cause and Effect Diagram',
            '5 why': 'Five Why Analysis Method'
        }
        
        self.safety_categories = {
            'high': ['critical', 'severe', 'major', 'urgent', 'immediate'],
            'medium': ['moderate', 'significant', 'important'],
            'low': ['minor', 'negligible', 'trivial']
        }
        
        self.common_misspellings = {
            'saftey': 'safety',
            'safty': 'safety',
            'incedent': 'incident',
            'incidant': 'incident',
            'permitt': 'permit',
            'observasion': 'observation',
            'observaton': 'observation',
            'workr': 'worker',
            'employe': 'employee',
            'manpowor': 'manpower',
            'trainig': 'training',
            'traning': 'training',
            'dashbord': 'dashboard',
            'dashbaord': 'dashboard',
            'statistcs': 'statistics',
            'statitsics': 'statistics',
            'overveiw': 'overview',
            'overviw': 'overview',
            'complience': 'compliance',
            'complance': 'compliance',
            'enviroment': 'environment',
            'enviornment': 'environment',
            'qualiy': 'quality',
            'qualty': 'quality',
            'inspectoin': 'inspection',
            'inspecton': 'inspection',
            'hieght': 'height',
            'heigth': 'height',
            'hight': 'height',
            'scaffoldig': 'scaffolding',
            'scafolding': 'scaffolding',
            'harnes': 'harness',
            'lanyrd': 'lanyard'
        }
        
        # Work at Height Safety Knowledge
        self.work_at_height_info = {
            'minimum_height': {
                'general': '2 meters (6.5 feet) - Most international standards',
                'osha_us': '1.8 meters (6 feet) - OSHA standard',
                'uk_hse': '2 meters (6.5 feet) - UK HSE regulation',
                'iso_45001': '2 meters (6.5 feet) - ISO 45001 guideline',
                'description': 'Work at height is defined as work in any place where a person could fall a distance liable to cause personal injury'
            },
            'fall_protection_requirements': [
                'Full body harness with appropriate attachment points',
                'Energy absorbing lanyard or self-retracting lifeline',
                'Secure anchor point rated for fall arrest loads',
                'Rescue plan in case of fall arrest',
                'Competent person supervision',
                'Pre-use inspection of all equipment'
            ],
            'hierarchy_of_controls': [
                '1. Elimination - Avoid work at height if possible',
                '2. Prevention - Use guardrails, safety nets',
                '3. Arrest - Use fall arrest systems (harness, lanyard)',
                '4. Mitigation - Reduce fall distance and consequences'
            ],
            'common_hazards': [
                'Falls from ladders, scaffolds, roofs',
                'Falling objects striking workers below',
                'Structural collapse of work platforms',
                'Weather conditions (wind, rain, ice)',
                'Electrical hazards from overhead lines',
                'Inadequate or damaged fall protection equipment'
            ],
            'training_requirements': [
                'Hazard recognition and risk assessment',
                'Proper use of fall protection equipment',
                'Inspection procedures for equipment',
                'Emergency rescue procedures',
                'Site-specific safety procedures'
            ]
        }
        
        # Welding Safety Knowledge
        self.welding_safety_info = {
            'ppe_requirements': {
                'head_protection': [
                    'Welding helmet with appropriate shade filter (Shade 10-14 for arc welding)',
                    'Safety glasses underneath helmet',
                    'Flame-resistant hood or cap'
                ],
                'eye_protection': [
                    'Auto-darkening or fixed shade welding lens',
                    'Side shields on safety glasses',
                    'UV and IR radiation protection'
                ],
                'respiratory_protection': [
                    'Respirator for fume exposure (P2/N95 minimum)',
                    'Supplied air respirator for confined spaces',
                    'Fume extraction at source when possible'
                ],
                'hand_protection': [
                    'Leather welding gloves (minimum 14-inch cuff)',
                    'Heat-resistant material (leather or Kevlar)',
                    'Proper fit to maintain dexterity'
                ],
                'body_protection': [
                    'Flame-resistant welding jacket or coveralls',
                    'Leather apron for overhead welding',
                    'Long pants (no synthetic materials)',
                    'High-top leather boots or safety boots',
                    'No exposed skin'
                ]
            },
            'welding_hazards': [
                'Arc flash and UV radiation burns',
                'Metal fume inhalation',
                'Fire and explosion risks',
                'Electric shock and electrocution',
                'Hot metal burns and spatter',
                'Compressed gas cylinder hazards',
                'Noise exposure from equipment'
            ],
            'safety_procedures': [
                'Inspect all equipment before use',
                'Ensure adequate ventilation',
                'Remove flammable materials from area',
                'Have fire extinguisher readily available',
                'Use proper grounding techniques',
                'Never weld in wet conditions',
                'Post hot work permits as required'
            ],
            'training_requirements': [
                'Welding process-specific training',
                'PPE selection and use',
                'Hazard recognition',
                'Emergency procedures',
                'Equipment maintenance',
                'Hot work permit procedures'
            ]
        }

class NLPProcessor:
    """Natural Language Processing for EHS queries"""
    
    def __init__(self, knowledge_base: EHSKnowledgeBase):
        self.kb = knowledge_base
        
    def correct_spelling(self, text: str) -> str:
        """Correct common spelling mistakes"""
        words = text.lower().split()
        corrected = []
        
        for word in words:
            # Remove punctuation for checking
            clean_word = re.sub(r'[^\w]', '', word)
            
            # Check direct misspellings
            if clean_word in self.kb.common_misspellings:
                corrected.append(self.kb.common_misspellings[clean_word])
            else:
                # Check EHS terminology for close matches
                matches = get_close_matches(clean_word, self.kb.ehs_terminology.keys(), n=1, cutoff=0.8)
                if matches:
                    corrected.append(matches[0])
                else:
                    corrected.append(word)
        
        return ' '.join(corrected)
    
    def extract_intent(self, query: str) -> Dict[str, Any]:
        """Extract user intent from query"""
        query = self.correct_spelling(query.lower())
        
        intent = {
            'action': 'search',
            'domain': 'general',
            'entities': [],
            'time_filter': None,
            'severity_filter': None,
            'status_filter': None,
            'confidence': 0.0
        }
        
        # Action detection
        if any(word in query for word in ['show', 'display', 'list', 'get', 'find']):
            intent['action'] = 'retrieve'
        elif any(word in query for word in ['count', 'how many', 'total', 'number']):
            intent['action'] = 'count'
        elif any(word in query for word in ['analyze', 'analysis', 'report', 'statistics', 'overview']):
            intent['action'] = 'analyze'
        elif any(word in query for word in ['create', 'add', 'new', 'submit']):
            intent['action'] = 'create'
        
        # Domain detection
        if any(word in query for word in ['safety', 'observation', 'hazard', 'ppe', 'accident']):
            intent['domain'] = 'safety'
            intent['confidence'] = 0.9
        elif any(word in query for word in ['incident', 'injury', 'emergency', 'near miss']):
            intent['domain'] = 'incident'
            intent['confidence'] = 0.9
        elif any(word in query for word in ['permit', 'ptw', 'authorization', 'hot work', 'confined space']):
            intent['domain'] = 'permit'
            intent['confidence'] = 0.9
        elif any(word in query for word in ['worker', 'employee', 'manpower', 'staff', 'attendance']):
            intent['domain'] = 'manpower'
            intent['confidence'] = 0.9
        elif any(word in query for word in ['training', 'induction', 'course', 'certification']):
            intent['domain'] = 'training'
            intent['confidence'] = 0.9
        elif any(word in query for word in ['dashboard', 'overview', 'summary', 'statistics']):
            intent['domain'] = 'dashboard'
            intent['confidence'] = 0.9
        elif any(word in query for word in ['environment', 'esg', 'carbon', 'emission', 'waste']):
            intent['domain'] = 'environment'
            intent['confidence'] = 0.8
        elif any(word in query for word in ['quality', 'inspection', 'audit', 'compliance']):
            intent['domain'] = 'quality'
            intent['confidence'] = 0.8
        
        # Time filter detection
        if any(word in query for word in ['today', 'current', 'now']):
            intent['time_filter'] = 'today'
        elif any(word in query for word in ['yesterday']):
            intent['time_filter'] = 'yesterday'
        elif any(word in query for word in ['week', 'weekly', 'this week']):
            intent['time_filter'] = 'week'
        elif any(word in query for word in ['month', 'monthly', 'this month']):
            intent['time_filter'] = 'month'
        elif any(word in query for word in ['recent', 'latest', 'new']):
            intent['time_filter'] = 'recent'
        
        # Severity filter detection
        if any(word in query for word in ['high', 'critical', 'severe', 'major', 'urgent']):
            intent['severity_filter'] = 'high'
        elif any(word in query for word in ['medium', 'moderate', 'significant']):
            intent['severity_filter'] = 'medium'
        elif any(word in query for word in ['low', 'minor', 'negligible']):
            intent['severity_filter'] = 'low'
        
        # Status filter detection
        if any(word in query for word in ['open', 'pending', 'active']):
            intent['status_filter'] = 'open'
        elif any(word in query for word in ['closed', 'completed', 'resolved']):
            intent['status_filter'] = 'closed'
        elif any(word in query for word in ['approved']):
            intent['status_filter'] = 'approved'
        elif any(word in query for word in ['rejected', 'denied']):
            intent['status_filter'] = 'rejected'
        
        return intent
    
    def generate_response(self, intent: Dict[str, Any], data: Any) -> str:
        """Generate natural language response"""
        domain = intent['domain']
        action = intent['action']
        
        if action == 'analyze' and domain == 'dashboard':
            return self._format_dashboard_response(data)
        elif domain == 'safety':
            return self._format_safety_response(data, intent)
        elif domain == 'incident':
            return self._format_incident_response(data, intent)
        elif domain == 'permit':
            return self._format_permit_response(data, intent)
        elif domain == 'manpower':
            return self._format_manpower_response(data, intent)
        else:
            return self._format_generic_response(data, intent)
    
    def _format_dashboard_response(self, data: Dict[str, Any]) -> str:
        """Format dashboard overview response"""
        if not data:
            return "📊 **Dashboard Overview**\n\nNo data available at the moment. Please check your system configuration."
        
        response = "📊 **EHS Dashboard Overview**\n\n"
        
        if 'safety' in data:
            safety = data['safety']
            response += f"🛡️ **Safety Statistics:**\n"
            response += f"• Total Observations: {safety.get('total_observations', 0)}\n"
            response += f"• High Severity: {safety.get('high_severity', 0)}\n"
            response += f"• Open Issues: {safety.get('open_observations', 0)}\n\n"
        
        if 'incidents' in data:
            incidents = data['incidents']
            response += f"🚨 **Incident Statistics:**\n"
            response += f"• Total Incidents: {incidents.get('total_incidents', 0)}\n"
            response += f"• Open Cases: {incidents.get('open_incidents', 0)}\n"
            response += f"• Resolved: {incidents.get('closed_incidents', 0)}\n\n"
        
        if 'permits' in data:
            permits = data['permits']
            response += f"📋 **Permit Statistics:**\n"
            response += f"• Total Permits: {permits.get('total_permits', 0)}\n"
            response += f"• Pending Approval: {permits.get('pending_permits', 0)}\n"
            response += f"• Active Permits: {permits.get('active_permits', 0)}\n\n"
        
        if 'workers' in data:
            workers = data['workers']
            response += f"👥 **Workforce Statistics:**\n"
            response += f"• Total Workers: {workers.get('total_workers', 0)}\n"
            response += f"• Active/Deployed: {workers.get('active_workers', 0)}\n"
            response += f"• In Training: {workers.get('initiated_workers', 0)}\n"
        
        return response
    
    def _format_safety_response(self, data: List[Dict], intent: Dict[str, Any]) -> str:
        """Format safety observation response"""
        if not data:
            return "✅ No safety observations found matching your criteria."
        
        severity = intent.get('severity_filter', '')
        response = f"🛡️ **Safety Observations"
        if severity:
            response += f" ({severity.title()} Severity)"
        response += ":**\n\n"
        
        for item in data[:5]:  # Limit to 5 items
            response += f"• **{item.get('title', 'N/A')}**\n"
            response += f"  📍 Location: {item.get('location', 'N/A')}\n"
            response += f"  🏢 Department: {item.get('department', 'N/A')}\n"
            response += f"  ⚠️ Severity: {item.get('severity', 'N/A')}\n"
            response += f"  📊 Status: {item.get('status', 'N/A')}\n"
            if item.get('description'):
                response += f"  📝 {item['description'][:100]}...\n"
            response += "\n"
        
        if len(data) > 5:
            response += f"... and {len(data) - 5} more observations.\n"
        
        return response
    
    def _format_incident_response(self, data: List[Dict], intent: Dict[str, Any]) -> str:
        """Format incident response"""
        if not data:
            return "✅ No incidents found matching your criteria."
        
        response = "🚨 **Incident Reports:**\n\n"
        
        for item in data[:5]:
            response += f"• **{item.get('title', 'N/A')}**\n"
            response += f"  📅 Date: {item.get('date', 'N/A')}\n"
            response += f"  📍 Location: {item.get('location', 'N/A')}\n"
            response += f"  📊 Status: {item.get('status', 'N/A')}\n"
            if item.get('cost'):
                response += f"  💰 Cost Impact: ${item['cost']}\n"
            response += "\n"
        
        return response
    
    def _format_permit_response(self, data: List[Dict], intent: Dict[str, Any]) -> str:
        """Format permit response"""
        if not data:
            return "✅ No permits found matching your criteria."
        
        response = "📋 **Work Permits:**\n\n"
        
        for item in data[:5]:
            response += f"• **{item.get('number', 'N/A')}**: {item.get('title', 'N/A')}\n"
            response += f"  📅 Date: {item.get('date', 'N/A')}\n"
            response += f"  📍 Location: {item.get('location', 'N/A')}\n"
            response += f"  📊 Status: {item.get('status', 'N/A')}\n"
            response += "\n"
        
        return response
    
    def _format_manpower_response(self, data: Dict[str, Any], intent: Dict[str, Any]) -> str:
        """Format manpower response"""
        if intent['action'] == 'count':
            return f"👥 **Workforce Count:** {data.get('total_workers', 0)} workers"
        
        response = "👥 **Workforce Information:**\n\n"
        if 'analytics' in data:
            analytics = data['analytics']
            response += f"• Total Workers: {analytics.get('total_workers', 0)}\n"
            response += f"• Average Hours: {analytics.get('average_hours', 0):.1f}\n"
            response += f"• Total Overtime: {analytics.get('total_overtime', 0):.1f} hours\n"
        
        return response
    
    def _format_generic_response(self, data: Any, intent: Dict[str, Any]) -> str:
        """Format generic response"""
        if isinstance(data, list) and data:
            return f"Found {len(data)} results for your query."
        elif isinstance(data, dict) and data:
            return "Here's the information you requested."
        else:
            return "No results found for your query. Try rephrasing or check spelling."

class EnhancedAIService:
    """Enhanced AI Service with NLP and EHS Knowledge"""
    
    def __init__(self):
        self.knowledge_base = EHSKnowledgeBase()
        self.standards_knowledge = EHSStandardsKnowledge()
        self.comprehensive_knowledge = ComprehensiveEHSKnowledge()
        self.nlp = NLPProcessor(self.knowledge_base)
    
    def process_query(self, query: str, user_id: int = None) -> Dict[str, Any]:
        """Process user query with enhanced NLP"""
        try:
            # Correct spelling and extract intent
            corrected_query = self.nlp.correct_spelling(query)
            intent = self.nlp.extract_intent(corrected_query)
            
            # Handle confined space queries
            if self._is_confined_space_query(query):
                return self._handle_confined_space_query(query)
            
            # Handle LOTO queries
            if self._is_loto_query(query):
                return self._handle_loto_query(query)
            
            # Handle welding queries
            if self._is_welding_query(query):
                return self._handle_welding_query(query)
            
            # Handle work at height queries
            if self._is_work_at_height_query(query):
                return self._handle_work_at_height_query(query)
            
            # Handle terminology queries
            if self._is_terminology_query(query):
                return self._handle_terminology_query(query)
            
            # Handle standards queries
            if self._is_standards_query(query):
                return self._handle_standards_query(query)
            
            # Search comprehensive knowledge base
            knowledge_results = self.comprehensive_knowledge.search_knowledge(query)
            if knowledge_results:
                return self._handle_comprehensive_knowledge_query(query, knowledge_results)
            
            # Get data based on intent
            data = self._fetch_data(intent, user_id)
            
            # Generate natural language response
            response = self.nlp.generate_response(intent, data)
            
            return {
                'type': 'enhanced_ai_response',
                'original_query': query,
                'corrected_query': corrected_query,
                'intent': intent,
                'answer': response,
                'data': data,
                'suggestions': self._generate_suggestions(intent)
            }
            
        except Exception as e:
            return {
                'type': 'enhanced_ai_response',
                'answer': 'I encountered an error processing your request. Please try rephrasing your question.',
                'suggestions': [
                    'Try "dashboard overview"',
                    'Try "safety observations"',
                    'Try "recent incidents"'
                ]
            }
    
    def _fetch_data(self, intent: Dict[str, Any], user_id: int = None) -> Any:
        """Fetch data based on intent"""
        domain = intent['domain']
        
        if domain == 'dashboard':
            return self._get_dashboard_data()
        elif domain == 'safety':
            return self._get_safety_data(intent)
        elif domain == 'incident':
            return self._get_incident_data(intent)
        elif domain == 'permit':
            return self._get_permit_data(intent)
        elif domain == 'manpower':
            return self._get_manpower_data(intent)
        else:
            return {}
    
    def _get_dashboard_data(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        try:
            from safetyobservation.models import SafetyObservation
            from incidentmanagement.models import Incident
            from ptw.models import Permit
            from worker.models import Worker
            
            data = {}
            
            # Safety statistics
            try:
                data['safety'] = {
                    'total_observations': SafetyObservation.objects.count(),
                    'high_severity': SafetyObservation.objects.filter(severity__gte=3).count(),
                    'open_observations': SafetyObservation.objects.filter(observationStatus='open').count()
                }
            except:
                pass
            
            # Incident statistics
            try:
                data['incidents'] = {
                    'total_incidents': Incident.objects.count(),
                    'open_incidents': Incident.objects.filter(status='open').count(),
                    'closed_incidents': Incident.objects.filter(status='closed').count()
                }
            except:
                pass
            
            # Permit statistics
            try:
                data['permits'] = {
                    'total_permits': Permit.objects.count(),
                    'pending_permits': Permit.objects.filter(status__in=['submitted', 'under_review']).count(),
                    'active_permits': Permit.objects.filter(status='approved').count()
                }
            except:
                pass
            
            # Worker statistics
            try:
                data['workers'] = {
                    'total_workers': Worker.objects.count(),
                    'active_workers': Worker.objects.filter(employment_status='deployed').count(),
                    'initiated_workers': Worker.objects.filter(employment_status='initiated').count()
                }
            except:
                pass
            
            return data
            
        except Exception:
            return {}
    
    def _get_safety_data(self, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get safety observation data"""
        try:
            from safetyobservation.models import SafetyObservation
            
            queryset = SafetyObservation.objects.all()
            
            # Apply filters based on intent
            if intent.get('severity_filter') == 'high':
                queryset = queryset.filter(severity__gte=3)
            elif intent.get('severity_filter') == 'medium':
                queryset = queryset.filter(severity=2)
            elif intent.get('severity_filter') == 'low':
                queryset = queryset.filter(severity=1)
            
            if intent.get('status_filter') == 'open':
                queryset = queryset.filter(observationStatus='open')
            elif intent.get('status_filter') == 'closed':
                queryset = queryset.filter(observationStatus='closed')
            
            # Apply time filters
            if intent.get('time_filter') == 'today':
                queryset = queryset.filter(created_at__date=timezone.now().date())
            elif intent.get('time_filter') == 'week':
                week_ago = timezone.now() - timedelta(days=7)
                queryset = queryset.filter(created_at__gte=week_ago)
            
            observations = queryset.order_by('-created_at')[:10]
            
            return [{
                'title': getattr(obs, 'observationID', 'N/A'),
                'description': getattr(obs, 'safetyObservationFound', 'N/A'),
                'location': getattr(obs, 'workLocation', 'N/A'),
                'department': getattr(obs, 'department', 'N/A'),
                'severity': getattr(obs, 'get_severity_display', lambda: 'N/A')(),
                'status': getattr(obs, 'get_observationStatus_display', lambda: 'N/A')(),
                'date': getattr(obs, 'created_at', timezone.now()).strftime('%Y-%m-%d')
            } for obs in observations]
            
        except Exception:
            return []
    
    def _get_incident_data(self, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get incident data"""
        try:
            from incidentmanagement.models import Incident
            
            queryset = Incident.objects.all()
            
            if intent.get('status_filter') == 'open':
                queryset = queryset.filter(status='open')
            elif intent.get('status_filter') == 'closed':
                queryset = queryset.filter(status='closed')
            
            incidents = queryset.order_by('-created_at')[:10]
            
            return [{
                'title': getattr(inc, 'title', 'N/A'),
                'location': getattr(inc, 'location', 'N/A'),
                'status': getattr(inc, 'status', 'N/A'),
                'cost': getattr(inc, 'cost_impact', 0),
                'date': getattr(inc, 'created_at', timezone.now()).strftime('%Y-%m-%d')
            } for inc in incidents]
            
        except Exception:
            return []
    
    def _get_permit_data(self, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get permit data"""
        try:
            from ptw.models import Permit
            
            queryset = Permit.objects.all()
            
            if intent.get('status_filter') == 'open':
                queryset = queryset.filter(status__in=['submitted', 'under_review'])
            elif intent.get('status_filter') == 'approved':
                queryset = queryset.filter(status='approved')
            
            permits = queryset.order_by('-created_at')[:10]
            
            return [{
                'number': getattr(permit, 'permit_number', 'N/A'),
                'title': getattr(permit, 'title', 'N/A'),
                'location': getattr(permit, 'location', 'N/A'),
                'status': getattr(permit, 'status', 'N/A'),
                'date': getattr(permit, 'created_at', timezone.now()).strftime('%Y-%m-%d')
            } for permit in permits]
            
        except Exception:
            return []
    
    def _get_manpower_data(self, intent: Dict[str, Any]) -> Dict[str, Any]:
        """Get manpower data"""
        try:
            from worker.models import Worker
            from manpower.models import ManpowerEntry
            
            data = {}
            
            if intent['action'] == 'count':
                data['total_workers'] = Worker.objects.count()
            else:
                # Get analytics
                total_workers = Worker.objects.count()
                active_workers = Worker.objects.filter(employment_status='deployed').count()
                
                # Get manpower entries for analytics
                entries = ManpowerEntry.objects.all()
                avg_hours = entries.aggregate(avg_hours=models.Avg('hours_worked'))['avg_hours'] or 0
                total_overtime = entries.aggregate(total_ot=models.Sum('overtime_hours'))['total_ot'] or 0
                
                data['analytics'] = {
                    'total_workers': total_workers,
                    'active_workers': active_workers,
                    'average_hours': avg_hours,
                    'total_overtime': total_overtime
                }
            
            return data
            
        except Exception:
            return {}
    
    def _generate_suggestions(self, intent: Dict[str, Any]) -> List[str]:
        """Generate contextual suggestions"""
        domain = intent['domain']
        
        suggestions = []
        
        if domain == 'safety':
            suggestions = [
                "Show high severity safety observations",
                "Show open safety issues",
                "Safety statistics by department"
            ]
        elif domain == 'incident':
            suggestions = [
                "Show open incidents",
                "Recent accident reports",
                "Incident cost analysis"
            ]
        elif domain == 'permit':
            suggestions = [
                "Show pending permits",
                "Active work permits",
                "Expired permits this week"
            ]
        elif domain == 'manpower':
            suggestions = [
                "Worker count by department",
                "Attendance statistics",
                "Overtime analysis"
            ]
        else:
            suggestions = [
                "Dashboard overview",
                "Safety observations",
                "Recent incidents",
                "Pending permits"
            ]
        
        return suggestions[:3]
    
    def _is_terminology_query(self, query: str) -> bool:
        """Check if query is asking for terminology definition"""
        query_lower = query.lower()
        return any(word in query_lower for word in ['meaning', 'definition', 'what is', 'define', 'explain']) or \
               any(term in query_lower for term in self.knowledge_base.ehs_terminology.keys())
    
    def _is_work_at_height_query(self, query: str) -> bool:
        """Check if query is about work at height"""
        query_lower = query.lower()
        height_keywords = [
            'work at height', 'working at height', 'height work', 'fall protection',
            'minimum height', 'height requirement', 'scaffolding', 'ladder',
            'harness', 'lanyard', 'anchor point', 'fall arrest', 'guardrail'
        ]
        return any(keyword in query_lower for keyword in height_keywords)
    
    def _is_welding_query(self, query: str) -> bool:
        """Check if query is about welding safety"""
        query_lower = query.lower()
        welding_keywords = [
            'welding', 'welder', 'arc welding', 'mig welding', 'tig welding',
            'welding ppe', 'welding safety', 'welding helmet', 'welding gloves',
            'hot work', 'cutting', 'brazing', 'soldering'
        ]
        return any(keyword in query_lower for keyword in welding_keywords)
    
    def _is_confined_space_query(self, query: str) -> bool:
        """Check if query is about confined space"""
        query_lower = query.lower()
        cs_keywords = [
            'confined space', 'permit required space', 'atmospheric testing',
            'space entry', 'entrant', 'attendant', 'entry permit'
        ]
        return any(keyword in query_lower for keyword in cs_keywords)
    
    def _is_loto_query(self, query: str) -> bool:
        """Check if query is about lockout tagout"""
        query_lower = query.lower()
        loto_keywords = [
            'lockout', 'tagout', 'loto', 'energy isolation',
            'hazardous energy', 'energy control', 'lockout procedure'
        ]
        return any(keyword in query_lower for keyword in loto_keywords)
    
    def _handle_terminology_query(self, query: str) -> Dict[str, Any]:
        """Handle terminology definition queries"""
        query_lower = query.lower()
        
        # Find matching terminology
        for term, definition in self.knowledge_base.ehs_terminology.items():
            if term in query_lower:
                return {
                    'type': 'enhanced_ai_response',
                    'answer': f"📚 **{term.upper()}** stands for **{definition}**\n\n" +
                             f"This is a common term used in EHS (Environment, Health & Safety) management.",
                    'suggestions': [
                        'Ask about other EHS terms',
                        'Show safety observations',
                        'Dashboard overview'
                    ]
                }
        
        # If no specific term found, provide general help
        return {
            'type': 'enhanced_ai_response',
            'answer': "I can help explain EHS terminology. Try asking about:\n\n" +
                     "• PPE (Personal Protective Equipment)\n" +
                     "• PTW (Permit to Work)\n" +
                     "• LOTO (Lock Out Tag Out)\n" +
                     "• JSA (Job Safety Analysis)\n" +
                     "• SOP (Standard Operating Procedure)\n" +
                     "• Work at Height Safety Requirements",
            'suggestions': [
                'What is PPE?',
                'Define LOTO',
                'Minimum height for work at height?'
            ]
        }
    
    def _handle_work_at_height_query(self, query: str) -> Dict[str, Any]:
        """Handle work at height safety queries"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['minimum height', 'height requirement', 'how high']):
            height_info = self.knowledge_base.work_at_height_info['minimum_height']
            response = "🏗️ **Work at Height - Minimum Height Requirements**\n\n"
            response += f"**{height_info['description']}**\n\n"
            response += "**Minimum Height Standards:**\n"
            response += f"• **General International**: {height_info['general']}\n"
            response += f"• **OSHA (US)**: {height_info['osha_us']}\n"
            response += f"• **UK HSE**: {height_info['uk_hse']}\n"
            response += f"• **ISO 45001**: {height_info['iso_45001']}\n\n"
            response += "⚠️ **Important**: Always check local regulations as requirements may vary by jurisdiction."
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Fall protection requirements',
                    'Work at height training',
                    'Scaffolding safety'
                ]
            }
        
        elif any(word in query_lower for word in ['fall protection', 'harness', 'safety equipment']):
            requirements = self.knowledge_base.work_at_height_info['fall_protection_requirements']
            response = "🦺 **Fall Protection Requirements**\n\n"
            response += "**Essential Equipment & Procedures:**\n"
            for req in requirements:
                response += f"• {req}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Minimum height requirements',
                    'Work at height hazards',
                    'Safety training requirements'
                ]
            }
        
        elif any(word in query_lower for word in ['hierarchy', 'control', 'prevention']):
            hierarchy = self.knowledge_base.work_at_height_info['hierarchy_of_controls']
            response = "📊 **Work at Height - Hierarchy of Controls**\n\n"
            for control in hierarchy:
                response += f"{control}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Fall protection equipment',
                    'Work at height hazards',
                    'Training requirements'
                ]
            }
        
        elif any(word in query_lower for word in ['hazard', 'risk', 'danger']):
            hazards = self.knowledge_base.work_at_height_info['common_hazards']
            response = "⚠️ **Common Work at Height Hazards**\n\n"
            for hazard in hazards:
                response += f"• {hazard}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Fall protection requirements',
                    'Safety controls',
                    'Risk assessment'
                ]
            }
        
        elif any(word in query_lower for word in ['training', 'competence', 'qualification']):
            training = self.knowledge_base.work_at_height_info['training_requirements']
            response = "🎓 **Work at Height Training Requirements**\n\n"
            response += "**Essential Training Topics:**\n"
            for topic in training:
                response += f"• {topic}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Fall protection equipment',
                    'Minimum height requirements',
                    'Safety procedures'
                ]
            }
        
        else:
            # General work at height information
            response = "🏗️ **Work at Height Safety Overview**\n\n"
            response += "Work at height is one of the leading causes of workplace fatalities and injuries.\n\n"
            response += "**Key Topics I can help with:**\n"
            response += "• Minimum height requirements\n"
            response += "• Fall protection equipment\n"
            response += "• Safety procedures and controls\n"
            response += "• Common hazards and risks\n"
            response += "• Training requirements\n"
            response += "• Regulatory compliance\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Minimum height for work at height?',
                    'Fall protection requirements',
                    'Work at height training'
                ]
            }
    
    def _is_standards_query(self, query: str) -> bool:
        """Check if query is about EHS standards"""
        query_lower = query.lower()
        standards_keywords = [
            'iso 45001', 'iso 14001', 'iso 9001', 'ohsas 18001',
            'standard', 'compliance', 'requirement', 'procedure',
            'audit', 'certification', 'clause', 'documentation'
        ]
        return any(keyword in query_lower for keyword in standards_keywords)
    
    def _handle_standards_query(self, query: str) -> Dict[str, Any]:
        """Handle EHS standards related queries"""
        query_lower = query.lower()
        
        # Specific standard queries
        if 'iso 45001' in query_lower:
            return self._get_standard_response('iso_45001', query)
        elif 'iso 14001' in query_lower:
            return self._get_standard_response('iso_14001', query)
        elif 'iso 9001' in query_lower:
            return self._get_standard_response('iso_9001', query)
        elif 'ohsas 18001' in query_lower:
            return self._get_standard_response('ohsas_18001', query)
        
        # Compliance queries
        elif any(word in query_lower for word in ['compliance', 'requirement']):
            return self._get_compliance_guidance(query)
        
        # Audit queries
        elif 'audit' in query_lower:
            return self._get_audit_guidance(query)
        
        # Procedure queries
        elif any(word in query_lower for word in ['procedure', 'process', 'how to']):
            return self._get_procedure_guidance_response(query)
        
        # General standards search
        else:
            return self._search_standards_response(query)
    
    def _get_standard_response(self, standard_key: str, query: str) -> Dict[str, Any]:
        """Get detailed response for specific standard"""
        std_info = self.standards_knowledge.get_standard_info(standard_key)
        
        if not std_info:
            return {
                'type': 'enhanced_ai_response',
                'answer': 'Standard information not found.',
                'suggestions': ['Try ISO 45001', 'Try ISO 14001', 'Try ISO 9001']
            }
        
        query_lower = query.lower()
        
        # Specific information requests
        if any(word in query_lower for word in ['requirement', 'clause']):
            response = f"📋 **{std_info['title']}**\n\n"
            response += f"**Key Requirements:**\n"
            for req in std_info['key_requirements']:
                response += f"• {req}\n"
            
            response += f"\n**Standard Clauses:**\n"
            for clause, desc in std_info['clauses'].items():
                response += f"• Clause {clause}: {desc}\n"
        
        elif any(word in query_lower for word in ['procedure', 'process']):
            response = f"📋 **{std_info['title']} - Procedures**\n\n"
            response += f"**Required Procedures:**\n"
            for proc in std_info['procedures']:
                response += f"• {proc}\n"
        
        else:
            # General overview
            response = f"📋 **{std_info['title']}**\n\n"
            response += f"{std_info['description']}\n\n"
            response += f"**Key Requirements:**\n"
            for req in std_info['key_requirements'][:5]:
                response += f"• {req}\n"
        
        return {
            'type': 'enhanced_ai_response',
            'answer': response,
            'suggestions': [
                f'{std_info["title"]} requirements',
                f'{std_info["title"]} procedures',
                f'{std_info["title"]} compliance'
            ]
        }
    
    def _get_compliance_guidance(self, query: str) -> Dict[str, Any]:
        """Provide compliance guidance"""
        response = "📊 **EHS Compliance Guidance**\n\n"
        
        if 'iso 45001' in query.lower():
            docs = self.standards_knowledge.get_compliance_requirements('iso_45001')
            response += "**ISO 45001 Documentation Requirements:**\n"
            for doc in docs[:8]:
                response += f"• {doc}\n"
        
        elif 'iso 14001' in query.lower():
            docs = self.standards_knowledge.get_compliance_requirements('iso_14001')
            response += "**ISO 14001 Documentation Requirements:**\n"
            for doc in docs[:8]:
                response += f"• {doc}\n"
        
        elif 'iso 9001' in query.lower():
            docs = self.standards_knowledge.get_compliance_requirements('iso_9001')
            response += "**ISO 9001 Documentation Requirements:**\n"
            for doc in docs[:8]:
                response += f"• {doc}\n"
        
        else:
            response += "**General Compliance Requirements:**\n"
            response += "• Documented management system\n"
            response += "• Legal compliance register\n"
            response += "• Risk assessment procedures\n"
            response += "• Training and competence records\n"
            response += "• Monitoring and measurement\n"
            response += "• Internal audit program\n"
            response += "• Management review process\n"
            response += "• Corrective action procedures\n"
        
        return {
            'type': 'enhanced_ai_response',
            'answer': response,
            'suggestions': [
                'ISO 45001 compliance',
                'ISO 14001 compliance',
                'Audit checklist'
            ]
        }
    
    def _get_audit_guidance(self, query: str) -> Dict[str, Any]:
        """Provide audit guidance"""
        response = "🔍 **EHS Audit Guidance**\n\n"
        
        if 'checklist' in query.lower():
            response += "**Audit Checklist Areas:**\n\n"
            
            leadership_items = self.standards_knowledge.get_audit_checklist('leadership')
            response += "**Leadership:**\n"
            for item in leadership_items:
                response += f"• {item}\n"
            
            response += "\n**Planning:**\n"
            planning_items = self.standards_knowledge.get_audit_checklist('planning')
            for item in planning_items:
                response += f"• {item}\n"
        
        else:
            response += "**Internal Audit Process:**\n"
            response += "• Plan audit program annually\n"
            response += "• Select competent auditors\n"
            response += "• Conduct opening meeting\n"
            response += "• Review documentation\n"
            response += "• Interview personnel\n"
            response += "• Observe activities\n"
            response += "• Document findings\n"
            response += "• Conduct closing meeting\n"
            response += "• Issue audit report\n"
            response += "• Follow up on corrective actions\n"
        
        return {
            'type': 'enhanced_ai_response',
            'answer': response,
            'suggestions': [
                'Audit checklist',
                'Internal audit procedure',
                'Corrective actions'
            ]
        }
    
    def _get_procedure_guidance_response(self, query: str) -> Dict[str, Any]:
        """Provide procedure implementation guidance"""
        query_lower = query.lower()
        
        if 'risk assessment' in query_lower:
            proc_info = self.standards_knowledge.get_procedure_guidance('risk_assessment')
            response = "⚠️ **Risk Assessment Procedure**\n\n"
            response += "**Steps:**\n"
            for step in proc_info.get('steps', []):
                response += f"{step}\n"
            response += "\n**Methods:**\n"
            for method in proc_info.get('methods', []):
                response += f"• {method}\n"
        
        elif 'incident investigation' in query_lower:
            proc_info = self.standards_knowledge.get_procedure_guidance('incident_investigation')
            response = "🔍 **Incident Investigation Procedure**\n\n"
            response += "**Steps:**\n"
            for step in proc_info.get('steps', []):
                response += f"{step}\n"
            response += "\n**Tools:**\n"
            for tool in proc_info.get('tools', []):
                response += f"• {tool}\n"
        
        elif 'management review' in query_lower:
            proc_info = self.standards_knowledge.get_procedure_guidance('management_review')
            response = "📊 **Management Review Procedure**\n\n"
            response += "**Required Inputs:**\n"
            for inp in proc_info.get('inputs', []):
                response += f"• {inp}\n"
            response += "\n**Expected Outputs:**\n"
            for out in proc_info.get('outputs', []):
                response += f"• {out}\n"
        
        else:
            response = "📋 **Common EHS Procedures**\n\n"
            response += "• Risk Assessment Procedure\n"
            response += "• Incident Investigation Procedure\n"
            response += "• Emergency Response Procedure\n"
            response += "• Training and Competence Procedure\n"
            response += "• Document Control Procedure\n"
            response += "• Internal Audit Procedure\n"
            response += "• Management Review Procedure\n"
            response += "• Corrective Action Procedure\n"
        
        return {
            'type': 'enhanced_ai_response',
            'answer': response,
            'suggestions': [
                'Risk assessment procedure',
                'Incident investigation procedure',
                'Management review procedure'
            ]
        }
    
    def _search_standards_response(self, query: str) -> Dict[str, Any]:
        """Search across all standards"""
        results = self.standards_knowledge.search_standards(query)
        
        if not results:
            return {
                'type': 'enhanced_ai_response',
                'answer': 'No specific standards information found. Try asking about ISO 45001, ISO 14001, ISO 9001, or OHSAS 18001.',
                'suggestions': [
                    'ISO 45001 requirements',
                    'ISO 14001 procedures',
                    'ISO 9001 compliance'
                ]
            }
        
        response = f"🔍 **Standards Search Results** ({len(results)} found)\n\n"
        
        for result in results[:5]:
            response += f"**{result['title']}**\n"
            if result['match_type'] == 'requirement':
                response += f"• Requirement: {result['requirement']}\n"
            elif result['match_type'] == 'procedure':
                response += f"• Procedure: {result['procedure']}\n"
            response += "\n"
        
        return {
            'type': 'enhanced_ai_response',
            'answer': response,
            'suggestions': [
                'ISO 45001 details',
                'ISO 14001 details',
                'Compliance requirements'
            ]
        }
    
    def _handle_welding_query(self, query: str) -> Dict[str, Any]:
        """Handle welding safety queries"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['ppe', 'personal protective equipment', 'protection', 'equipment']):
            # Get comprehensive welding PPE info
            welding_info = self.comprehensive_knowledge.get_safety_info('welding')
            if 'ppe_by_process' in welding_info:
                response = "🔥 **Comprehensive Welding PPE Requirements**\n\n"
                
                for process, ppe in welding_info['ppe_by_process'].items():
                    process_name = process.replace('_', ' ').title()
                    response += f"**{process_name}:**\n"
                    for protection_type, requirement in ppe.items():
                        type_name = protection_type.replace('_', ' ').title()
                        response += f"• {type_name}: {requirement}\n"
                    response += "\n"
                
                response += "**Ventilation Requirements:**\n"
                ventilation = welding_info.get('ventilation_requirements', {})
                for condition, requirement in ventilation.items():
                    condition_name = condition.replace('_', ' ').title()
                    response += f"• {condition_name}: {requirement}\n"
            else:
                # Fallback to basic PPE info
                ppe_info = self.knowledge_base.welding_safety_info['ppe_requirements']
                response = "🔥 **Welding PPE Requirements**\n\n"
                
                response += "**Head & Eye Protection:**\n"
                for item in ppe_info['head_protection']:
                    response += f"• {item}\n"
                for item in ppe_info['eye_protection']:
                    response += f"• {item}\n"
                
                response += "\n**Respiratory Protection:**\n"
                for item in ppe_info['respiratory_protection']:
                    response += f"• {item}\n"
                
                response += "\n**Hand Protection:**\n"
                for item in ppe_info['hand_protection']:
                    response += f"• {item}\n"
                
                response += "\n**Body Protection:**\n"
                for item in ppe_info['body_protection']:
                    response += f"• {item}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Welding hazards',
                    'Welding safety procedures',
                    'Hot work permits'
                ]
            }
        
        elif any(word in query_lower for word in ['hazard', 'risk', 'danger']):
            # Get comprehensive hazard info
            welding_info = self.comprehensive_knowledge.get_safety_info('welding')
            hazards = welding_info.get('hazards', [])
            if hazards:
                response = "⚠️ **Comprehensive Welding Hazards**\n\n"
                for hazard in hazards:
                    response += f"• {hazard}\n"
            else:
                # Fallback to basic hazards
                hazards = self.knowledge_base.welding_safety_info['welding_hazards']
                response = "⚠️ **Welding Hazards**\n\n"
                for hazard in hazards:
                    response += f"• {hazard}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Welding PPE requirements',
                    'Welding safety procedures',
                    'Training requirements'
                ]
            }
        
        elif any(word in query_lower for word in ['procedure', 'safety', 'process']):
            procedures = self.knowledge_base.welding_safety_info['safety_procedures']
            response = "🛡️ **Welding Safety Procedures**\n\n"
            for procedure in procedures:
                response += f"• {procedure}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Welding PPE requirements',
                    'Welding hazards',
                    'Training requirements'
                ]
            }
        
        elif any(word in query_lower for word in ['training', 'competence', 'qualification']):
            training = self.knowledge_base.welding_safety_info['training_requirements']
            response = "🎓 **Welding Training Requirements**\n\n"
            for req in training:
                response += f"• {req}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Welding PPE requirements',
                    'Welding safety procedures',
                    'Welding hazards'
                ]
            }
        
        else:
            # General welding safety information
            response = "🔥 **Welding Safety Overview**\n\n"
            response += "Welding operations present multiple hazards requiring comprehensive safety measures.\n\n"
            response += "**Key Safety Topics:**\n"
            response += "• Personal Protective Equipment (PPE)\n"
            response += "• Hazard identification and control\n"
            response += "• Safety procedures and protocols\n"
            response += "• Training and competency requirements\n"
            response += "• Hot work permit procedures\n"
            response += "• Emergency response planning\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'PPE required for welding activity?',
                    'Welding hazards',
                    'Welding safety procedures'
                ]
            }
    
    def _handle_comprehensive_knowledge_query(self, query: str, results: list) -> Dict[str, Any]:
        """Handle queries using comprehensive EHS knowledge"""
        if not results:
            return {
                'type': 'enhanced_ai_response',
                'answer': 'No specific information found. Try asking about safety procedures, PPE requirements, or emergency response.',
                'suggestions': ['PPE requirements', 'Safety procedures', 'Emergency response']
            }
        
        response = f"📚 **EHS Knowledge Base Results** ({len(results)} found)\n\n"
        
        for result in results[:3]:  # Limit to top 3 results
            category = result['category']
            topic = result['topic'].replace('_', ' ').title()
            content = result['content']
            
            response += f"**{category} - {topic}:**\n"
            
            # Format content based on type
            if isinstance(content, dict):
                for key, value in list(content.items())[:5]:  # Limit items
                    key_formatted = key.replace('_', ' ').title()
                    if isinstance(value, list):
                        response += f"• {key_formatted}: {', '.join(value[:3])}\n"
                    elif isinstance(value, str):
                        response += f"• {key_formatted}: {value}\n"
                    elif isinstance(value, dict) and len(str(value)) < 100:
                        response += f"• {key_formatted}: {str(value)}\n"
            elif isinstance(content, list):
                for item in content[:5]:
                    response += f"• {item}\n"
            
            response += "\n"
        
        # Generate contextual suggestions
        suggestions = []
        for result in results[:3]:
            topic = result['topic'].replace('_', ' ')
            suggestions.append(f"{topic} details")
        
        return {
            'type': 'enhanced_ai_response',
            'answer': response,
            'suggestions': suggestions
        }
    
    def _handle_confined_space_query(self, query: str) -> Dict[str, Any]:
        """Handle confined space safety queries"""
        cs_info = self.comprehensive_knowledge.get_safety_info('confined_space')
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['entry', 'procedure', 'requirements']):
            response = "🏭 **Confined Space Entry Requirements**\n\n"
            response += f"**Definition:** {cs_info.get('definition', 'N/A')}\n\n"
            
            response += "**Permit Required Criteria:**\n"
            for criteria in cs_info.get('permit_required_criteria', []):
                response += f"• {criteria}\n"
            
            response += "\n**Entry Procedures:**\n"
            for procedure in cs_info.get('entry_procedures', []):
                response += f"• {procedure}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Atmospheric testing requirements',
                    'Confined space hazards',
                    'Entry permit procedures'
                ]
            }
        
        elif any(word in query_lower for word in ['atmospheric', 'testing', 'monitoring']):
            response = "🌬️ **Confined Space Atmospheric Testing**\n\n"
            testing = cs_info.get('atmospheric_testing', {})
            
            response += "**Acceptable Ranges:**\n"
            for param, range_val in testing.items():
                if param != 'testing_order':
                    param_name = param.replace('_', ' ').title()
                    response += f"• {param_name}: {range_val}\n"
            
            response += f"\n**Testing Order:**\n"
            for i, test in enumerate(testing.get('testing_order', []), 1):
                response += f"{i}. {test}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Confined space entry procedures',
                    'Gas detection equipment',
                    'Ventilation requirements'
                ]
            }
        
        else:
            response = "🏭 **Confined Space Safety Overview**\n\n"
            response += f"**Definition:** {cs_info.get('definition', 'N/A')}\n\n"
            response += "**Key Safety Topics:**\n"
            response += "• Entry procedures and permits\n"
            response += "• Atmospheric testing and monitoring\n"
            response += "• Ventilation requirements\n"
            response += "• Emergency rescue procedures\n"
            response += "• Training and competency\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Confined space entry requirements',
                    'Atmospheric testing procedures',
                    'Emergency rescue procedures'
                ]
            }
    
    def _handle_loto_query(self, query: str) -> Dict[str, Any]:
        """Handle lockout tagout queries"""
        loto_info = self.comprehensive_knowledge.get_safety_info('loto')
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['procedure', 'steps', 'process']):
            response = "🔒 **Lockout/Tagout Procedure**\n\n"
            response += f"**Definition:** {loto_info.get('definition', 'N/A')}\n\n"
            
            response += "**LOTO Procedure Steps:**\n"
            for step in loto_info.get('procedure_steps', []):
                response += f"{step}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'Energy types in LOTO',
                    'LOTO device requirements',
                    'LOTO training requirements'
                ]
            }
        
        elif any(word in query_lower for word in ['energy', 'types', 'sources']):
            response = "⚡ **Hazardous Energy Types**\n\n"
            response += "**Energy Sources to Control:**\n"
            for energy_type in loto_info.get('energy_types', []):
                response += f"• {energy_type}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'LOTO procedure steps',
                    'Device requirements',
                    'Verification methods'
                ]
            }
        
        elif any(word in query_lower for word in ['device', 'lock', 'tag', 'requirements']):
            response = "🏷️ **LOTO Device Requirements**\n\n"
            devices = loto_info.get('device_requirements', {})
            
            for device_type, requirement in devices.items():
                device_name = device_type.replace('_', ' ').title()
                response += f"**{device_name}:** {requirement}\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'LOTO procedure steps',
                    'Energy isolation methods',
                    'Training requirements'
                ]
            }
        
        else:
            response = "🔒 **Lockout/Tagout (LOTO) Overview**\n\n"
            response += f"**Definition:** {loto_info.get('definition', 'N/A')}\n\n"
            response += "**Key LOTO Topics:**\n"
            response += "• Procedure steps and implementation\n"
            response += "• Hazardous energy identification\n"
            response += "• Device requirements and standards\n"
            response += "• Training and competency\n"
            response += "• Verification and testing\n"
            
            return {
                'type': 'enhanced_ai_response',
                'answer': response,
                'suggestions': [
                    'LOTO procedure steps',
                    'Hazardous energy types',
                    'Device requirements'
                ]
            }
