"""
EHS Standards Knowledge Base - ISO 45001, ISO 14001, ISO 9001, OHSAS 18001
Comprehensive standards, procedures, requirements and compliance guidance
"""

class EHSStandardsKnowledge:
    """Comprehensive EHS Standards Knowledge Base"""
    
    def __init__(self):
        self.standards = {
            'iso_45001': {
                'title': 'ISO 45001:2018 - Occupational Health and Safety Management Systems',
                'description': 'International standard for occupational health and safety management systems',
                'key_requirements': [
                    'Leadership and worker participation',
                    'Planning (hazard identification, risk assessment)',
                    'Support (resources, competence, communication)',
                    'Operation (operational planning and control)',
                    'Performance evaluation (monitoring, audit, review)',
                    'Improvement (incident investigation, corrective action)'
                ],
                'clauses': {
                    '4': 'Context of the organization',
                    '5': 'Leadership and worker participation',
                    '6': 'Planning',
                    '7': 'Support',
                    '8': 'Operation',
                    '9': 'Performance evaluation',
                    '10': 'Improvement'
                },
                'procedures': [
                    'Hazard identification and risk assessment',
                    'Incident investigation procedure',
                    'Emergency preparedness and response',
                    'Management of change procedure',
                    'Contractor management procedure',
                    'Training and competence procedure',
                    'Communication and consultation procedure'
                ]
            },
            'iso_14001': {
                'title': 'ISO 14001:2015 - Environmental Management Systems',
                'description': 'International standard for environmental management systems',
                'key_requirements': [
                    'Environmental policy',
                    'Environmental aspects and impacts identification',
                    'Legal and other requirements',
                    'Environmental objectives and targets',
                    'Environmental management programs',
                    'Monitoring and measurement'
                ],
                'clauses': {
                    '4': 'Context of the organization',
                    '5': 'Leadership',
                    '6': 'Planning',
                    '7': 'Support',
                    '8': 'Operation',
                    '9': 'Performance evaluation',
                    '10': 'Improvement'
                },
                'procedures': [
                    'Environmental aspects identification',
                    'Legal compliance evaluation',
                    'Environmental monitoring procedure',
                    'Waste management procedure',
                    'Emergency response procedure',
                    'Supplier environmental evaluation',
                    'Environmental training procedure'
                ]
            },
            'iso_9001': {
                'title': 'ISO 9001:2015 - Quality Management Systems',
                'description': 'International standard for quality management systems',
                'key_requirements': [
                    'Customer focus',
                    'Leadership commitment',
                    'Process approach',
                    'Improvement',
                    'Evidence-based decision making',
                    'Relationship management'
                ],
                'clauses': {
                    '4': 'Context of the organization',
                    '5': 'Leadership',
                    '6': 'Planning',
                    '7': 'Support',
                    '8': 'Operation',
                    '9': 'Performance evaluation',
                    '10': 'Improvement'
                },
                'procedures': [
                    'Document control procedure',
                    'Management review procedure',
                    'Internal audit procedure',
                    'Corrective action procedure',
                    'Customer complaint handling',
                    'Supplier evaluation procedure',
                    'Product/service realization procedure'
                ]
            },
            'ohsas_18001': {
                'title': 'OHSAS 18001:2007 - Occupational Health and Safety Management',
                'description': 'Former British standard for OH&S management (superseded by ISO 45001)',
                'key_requirements': [
                    'OH&S policy',
                    'Hazard identification and risk assessment',
                    'Legal and other requirements',
                    'Objectives and programs',
                    'Implementation and operation',
                    'Checking and corrective action'
                ],
                'clauses': {
                    '4.1': 'General requirements',
                    '4.2': 'OH&S policy',
                    '4.3': 'Planning',
                    '4.4': 'Implementation and operation',
                    '4.5': 'Checking',
                    '4.6': 'Management review'
                },
                'procedures': [
                    'Hazard identification procedure',
                    'Risk assessment methodology',
                    'Incident investigation procedure',
                    'Emergency preparedness procedure',
                    'OH&S training procedure',
                    'Monitoring and measurement procedure'
                ]
            }
        }
        
        self.compliance_requirements = {
            'documentation': {
                'iso_45001': [
                    'OH&S policy',
                    'OH&S objectives',
                    'Hazard identification process',
                    'Risk assessment methodology',
                    'Applicable legal requirements',
                    'OH&S competence requirements',
                    'Communication process',
                    'Operational controls',
                    'Emergency preparedness procedures',
                    'Monitoring and measurement process',
                    'Audit program',
                    'Management review results'
                ],
                'iso_14001': [
                    'Environmental policy',
                    'Environmental aspects and impacts',
                    'Legal and other requirements register',
                    'Environmental objectives and targets',
                    'Environmental management programs',
                    'Competence and training records',
                    'Communication procedures',
                    'Operational control procedures',
                    'Emergency preparedness procedures',
                    'Monitoring and measurement procedures',
                    'Audit program and results',
                    'Management review records'
                ],
                'iso_9001': [
                    'Quality policy',
                    'Quality objectives',
                    'Quality manual (if applicable)',
                    'Documented procedures',
                    'Work instructions',
                    'Quality records',
                    'Customer requirements',
                    'Design and development records',
                    'Supplier evaluation records',
                    'Monitoring and measurement procedures',
                    'Internal audit program',
                    'Management review records'
                ]
            },
            'audit_checklist': {
                'leadership': [
                    'Is top management committed to the management system?',
                    'Are roles and responsibilities clearly defined?',
                    'Is there evidence of leadership engagement?',
                    'Are resources adequately provided?'
                ],
                'planning': [
                    'Are risks and opportunities identified?',
                    'Are objectives established and planned?',
                    'Is there a process for managing change?',
                    'Are legal requirements identified and tracked?'
                ],
                'operation': [
                    'Are operational controls implemented?',
                    'Are competence requirements defined?',
                    'Is communication effective?',
                    'Are emergency procedures in place?'
                ],
                'evaluation': [
                    'Is monitoring and measurement conducted?',
                    'Are internal audits performed regularly?',
                    'Is management review conducted?',
                    'Are nonconformities addressed?'
                ]
            }
        }
        
        self.common_procedures = {
            'risk_assessment': {
                'steps': [
                    '1. Identify hazards/aspects',
                    '2. Determine who/what might be harmed',
                    '3. Evaluate risks/impacts',
                    '4. Record findings',
                    '5. Review and update regularly'
                ],
                'methods': [
                    'Job Safety Analysis (JSA)',
                    'Hazard and Operability Study (HAZOP)',
                    'Failure Mode and Effects Analysis (FMEA)',
                    'Bow-tie analysis',
                    'Risk matrix assessment'
                ]
            },
            'incident_investigation': {
                'steps': [
                    '1. Immediate response and scene securing',
                    '2. Gather information and evidence',
                    '3. Analyze causes (root cause analysis)',
                    '4. Develop corrective actions',
                    '5. Implement and follow up',
                    '6. Share lessons learned'
                ],
                'tools': [
                    '5 Why analysis',
                    'Fishbone diagram',
                    'Fault tree analysis',
                    'Timeline analysis',
                    'Witness interviews'
                ]
            },
            'management_review': {
                'inputs': [
                    'Status of previous management review actions',
                    'Changes in internal/external issues',
                    'Performance and effectiveness information',
                    'Adequacy of resources',
                    'Communication from interested parties',
                    'Opportunities for improvement'
                ],
                'outputs': [
                    'Decisions on improvement opportunities',
                    'Need for changes to management system',
                    'Resource needs',
                    'Actions if needed'
                ]
            }
        }
        
        self.legal_requirements = {
            'occupational_safety': [
                'Occupational Safety and Health Act (OSHA)',
                'Personal Protective Equipment standards',
                'Hazard Communication Standard',
                'Lockout/Tagout procedures',
                'Confined space entry requirements',
                'Fall protection standards',
                'Machine guarding requirements',
                'Emergency action plans'
            ],
            'environmental': [
                'Clean Air Act compliance',
                'Clean Water Act requirements',
                'Waste management regulations',
                'Chemical storage and handling',
                'Spill prevention and response',
                'Environmental impact assessments',
                'Emission monitoring requirements',
                'Waste disposal permits'
            ],
            'quality': [
                'Product safety standards',
                'Customer specification requirements',
                'Industry-specific regulations',
                'Calibration requirements',
                'Traceability requirements',
                'Labeling and marking standards',
                'Testing and inspection requirements'
            ]
        }
        
        self.best_practices = {
            'implementation': [
                'Secure top management commitment',
                'Conduct gap analysis against standards',
                'Develop implementation plan with timelines',
                'Provide adequate training and resources',
                'Establish clear roles and responsibilities',
                'Implement in phases with pilot areas',
                'Monitor progress and adjust as needed',
                'Prepare for certification audit'
            ],
            'maintenance': [
                'Regular internal audits',
                'Continuous monitoring and measurement',
                'Management review meetings',
                'Employee training and awareness',
                'Document control and updates',
                'Corrective and preventive actions',
                'Benchmarking and improvement',
                'Stakeholder engagement'
            ]
        }

    def get_standard_info(self, standard_name: str) -> dict:
        """Get comprehensive information about a specific standard"""
        return self.standards.get(standard_name.lower().replace(' ', '_').replace('-', '_'), {})
    
    def get_compliance_requirements(self, standard_name: str) -> list:
        """Get compliance requirements for a standard"""
        return self.compliance_requirements.get('documentation', {}).get(
            standard_name.lower().replace(' ', '_').replace('-', '_'), []
        )
    
    def get_procedure_guidance(self, procedure_name: str) -> dict:
        """Get guidance for implementing specific procedures"""
        return self.common_procedures.get(procedure_name.lower().replace(' ', '_'), {})
    
    def search_standards(self, query: str) -> list:
        """Search across all standards for relevant information"""
        results = []
        query_lower = query.lower()
        
        for std_key, std_info in self.standards.items():
            # Search in title and description
            if query_lower in std_info['title'].lower() or query_lower in std_info['description'].lower():
                results.append({
                    'standard': std_key,
                    'title': std_info['title'],
                    'match_type': 'title_description'
                })
            
            # Search in requirements
            for req in std_info['key_requirements']:
                if query_lower in req.lower():
                    results.append({
                        'standard': std_key,
                        'title': std_info['title'],
                        'requirement': req,
                        'match_type': 'requirement'
                    })
            
            # Search in procedures
            for proc in std_info['procedures']:
                if query_lower in proc.lower():
                    results.append({
                        'standard': std_key,
                        'title': std_info['title'],
                        'procedure': proc,
                        'match_type': 'procedure'
                    })
        
        return results
    
    def get_audit_checklist(self, area: str) -> list:
        """Get audit checklist for specific area"""
        return self.compliance_requirements.get('audit_checklist', {}).get(area.lower(), [])
    
    def get_legal_requirements(self, domain: str) -> list:
        """Get legal requirements for specific domain"""
        return self.legal_requirements.get(domain.lower().replace(' ', '_'), [])