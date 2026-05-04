"""
Comprehensive EHS Knowledge Base from Open Source Standards
Based on OSHA, NIOSH, HSE, ISO standards and industry best practices
"""

class ComprehensiveEHSKnowledge:
    def __init__(self):
        self.safety_knowledge = {
            # Work at Height
            'work_at_height': {
                'definition': 'Work in any place where a person could fall a distance liable to cause personal injury',
                'height_thresholds': {
                    'osha_us': '6 feet (1.8m)',
                    'uk_hse': '6.5 feet (2m)', 
                    'canada': '10 feet (3m)',
                    'australia': '6.5 feet (2m)',
                    'eu': '6.5 feet (2m)'
                },
                'ppe_requirements': [
                    'Full body harness (ANSI Z359.11)',
                    'Energy absorbing lanyard or SRL',
                    'Hard hat with chin strap',
                    'Non-slip safety boots',
                    'High-visibility clothing'
                ],
                'fall_protection_hierarchy': [
                    '1. Elimination - avoid work at height',
                    '2. Passive fall prevention - guardrails, covers',
                    '3. Fall restraint systems - prevent reaching edge',
                    '4. Fall arrest systems - stop fall in progress',
                    '5. Administrative controls - training, procedures'
                ]
            },
            
            # Welding Safety
            'welding': {
                'ppe_by_process': {
                    'arc_welding': {
                        'eye_protection': 'Shade 10-14 filter lens',
                        'head': 'Welding helmet with auto-darkening filter',
                        'respiratory': 'P2/N95 minimum for mild steel, supplied air for stainless',
                        'hands': 'Leather welding gloves, 14" minimum cuff',
                        'body': 'Flame-resistant jacket, leather apron for overhead',
                        'feet': 'Leather safety boots, high-top preferred'
                    },
                    'oxy_fuel': {
                        'eye_protection': 'Shade 4-8 filter lens',
                        'head': 'Welding goggles or helmet',
                        'respiratory': 'Adequate ventilation, respirator if confined',
                        'hands': 'Heat-resistant gloves',
                        'body': 'Natural fiber clothing, no synthetics'
                    }
                },
                'hazards': [
                    'Arc flash/UV radiation burns',
                    'Metal fume fever from zinc, lead',
                    'Fire/explosion from flammable materials',
                    'Electric shock (up to 600V)',
                    'Hot metal burns and spatter',
                    'Compressed gas hazards',
                    'Noise exposure (>85 dBA)'
                ],
                'ventilation_requirements': {
                    'general': '2000 cfm per welder minimum',
                    'confined_space': 'Supplied air mandatory',
                    'stainless_steel': 'Local exhaust ventilation required',
                    'galvanized': 'Mechanical ventilation mandatory'
                }
            },
            
            # Confined Space
            'confined_space': {
                'definition': 'Space large enough for entry, limited entry/exit, not designed for occupancy',
                'permit_required_criteria': [
                    'Contains/potential for hazardous atmosphere',
                    'Material that could engulf entrant',
                    'Internal configuration could trap/asphyxiate',
                    'Any other recognized serious safety hazard'
                ],
                'atmospheric_testing': {
                    'oxygen': '19.5% - 23.5% acceptable range',
                    'flammable_gas': '<10% LEL (Lower Explosive Limit)',
                    'toxic_gases': 'Below PEL/TLV values',
                    'testing_order': ['Oxygen', 'Flammable gases', 'Toxic gases']
                },
                'entry_procedures': [
                    'Atmospheric testing and monitoring',
                    'Ventilation (natural or mechanical)',
                    'Entry permit completion',
                    'Attendant stationed outside',
                    'Communication system established',
                    'Rescue procedures in place'
                ]
            },
            
            # Hot Work
            'hot_work': {
                'definition': 'Work involving open flames, producing heat/sparks, or temperatures >400°F',
                'examples': ['Welding', 'Cutting', 'Brazing', 'Grinding', 'Torch operations'],
                'fire_watch_requirements': [
                    'During hot work operations',
                    '30 minutes after completion minimum',
                    'Fire extinguisher readily available',
                    'Clear communication with operator',
                    'Authority to stop work if unsafe'
                ],
                'area_preparation': [
                    'Remove combustibles within 35 feet',
                    'Cover immovable combustibles',
                    'Wet down combustible floors',
                    'Close openings in walls/floors',
                    'Relocate gas cylinders safely'
                ]
            },
            
            # Lockout/Tagout (LOTO)
            'loto': {
                'definition': 'Control of hazardous energy during maintenance/servicing',
                'energy_types': [
                    'Electrical (primary and stored)',
                    'Mechanical (springs, compressed air)',
                    'Hydraulic pressure',
                    'Pneumatic pressure',
                    'Chemical energy',
                    'Thermal energy (steam, hot surfaces)'
                ],
                'procedure_steps': [
                    '1. Preparation - identify energy sources',
                    '2. Shutdown - normal stopping procedures',
                    '3. Isolation - disconnect energy sources',
                    '4. Lockout/Tagout - apply devices',
                    '5. Verification - test isolation effectiveness',
                    '6. Work performance - maintain isolation',
                    '7. Restoration - remove devices, restore energy'
                ],
                'device_requirements': {
                    'locks': 'Standardized, durable, substantial',
                    'tags': 'Standardized, legible, warning message',
                    'devices': 'Substantial enough to prevent removal'
                }
            }
        }
        
        self.chemical_safety = {
            'ghs_classification': {
                'physical_hazards': [
                    'Explosives', 'Flammable gases', 'Aerosols', 'Oxidizing gases',
                    'Gases under pressure', 'Flammable liquids', 'Flammable solids',
                    'Self-reactive substances', 'Pyrophoric liquids/solids',
                    'Self-heating substances', 'Water-reactive substances',
                    'Oxidizing liquids/solids', 'Organic peroxides',
                    'Corrosive to metals'
                ],
                'health_hazards': [
                    'Acute toxicity', 'Skin corrosion/irritation',
                    'Serious eye damage/irritation', 'Respiratory sensitization',
                    'Skin sensitization', 'Germ cell mutagenicity',
                    'Carcinogenicity', 'Reproductive toxicity',
                    'Target organ toxicity (single/repeated exposure)',
                    'Aspiration hazard'
                ]
            },
            'exposure_limits': {
                'pel': 'Permissible Exposure Limit (OSHA legal limit)',
                'tlv': 'Threshold Limit Value (ACGIH recommendation)',
                'rel': 'Recommended Exposure Limit (NIOSH)',
                'stel': 'Short Term Exposure Limit (15 minutes)',
                'ceiling': 'Never to be exceeded limit'
            },
            'ppe_selection': {
                'respiratory': {
                    'air_purifying': 'Filters/cartridges for specific contaminants',
                    'supplied_air': 'Independent air source, higher protection',
                    'scba': 'Self-contained, highest protection level'
                },
                'skin_protection': {
                    'chemical_gloves': 'Material specific to chemical compatibility',
                    'chemical_suits': 'Full body protection for severe hazards',
                    'aprons': 'Splash protection for torso'
                }
            }
        }
        
        self.environmental_safety = {
            'air_quality': {
                'pollutants': {
                    'pm2.5': 'Particulate matter <2.5 microns',
                    'pm10': 'Particulate matter <10 microns',
                    'no2': 'Nitrogen dioxide',
                    'so2': 'Sulfur dioxide',
                    'co': 'Carbon monoxide',
                    'o3': 'Ground-level ozone',
                    'pb': 'Lead particles'
                },
                'monitoring': 'Continuous ambient air monitoring required',
                'limits': 'EPA National Ambient Air Quality Standards'
            },
            'water_protection': {
                'parameters': {
                    'ph': '6.5-8.5 typical discharge range',
                    'bod': 'Biochemical Oxygen Demand <30 mg/L',
                    'cod': 'Chemical Oxygen Demand <125 mg/L',
                    'tss': 'Total Suspended Solids <30 mg/L',
                    'oil_grease': '<15 mg/L for most discharges'
                },
                'spill_response': [
                    'Immediate containment',
                    'Notification to authorities',
                    'Source control',
                    'Recovery operations',
                    'Environmental monitoring',
                    'Remediation if required'
                ]
            },
            'waste_management': {
                'hierarchy': [
                    '1. Source reduction/prevention',
                    '2. Reuse',
                    '3. Recycling/composting',
                    '4. Energy recovery',
                    '5. Treatment and disposal'
                ],
                'hazardous_waste': {
                    'characteristics': ['Ignitable', 'Corrosive', 'Reactive', 'Toxic'],
                    'generator_categories': {
                        'large': '>1000 kg/month',
                        'small': '100-1000 kg/month',
                        'very_small': '<100 kg/month'
                    }
                }
            }
        }
        
        self.emergency_response = {
            'fire_safety': {
                'fire_classes': {
                    'class_a': 'Ordinary combustibles (wood, paper, fabric)',
                    'class_b': 'Flammable liquids (gasoline, oil, grease)',
                    'class_c': 'Electrical equipment',
                    'class_d': 'Combustible metals (magnesium, titanium)',
                    'class_k': 'Cooking oils and fats'
                },
                'extinguisher_types': {
                    'water': 'Class A fires only',
                    'foam': 'Class A and B fires',
                    'co2': 'Class B and C fires',
                    'dry_chemical': 'Class A, B, C fires',
                    'wet_chemical': 'Class K fires'
                },
                'evacuation_procedures': [
                    'Alarm activation',
                    'Orderly evacuation via designated routes',
                    'Assembly at muster points',
                    'Headcount verification',
                    'Emergency services notification',
                    'All-clear before re-entry'
                ]
            },
            'medical_emergencies': {
                'first_aid_priorities': [
                    '1. Ensure scene safety',
                    '2. Check responsiveness',
                    '3. Call for help (911/emergency)',
                    '4. Check airway, breathing, circulation',
                    '5. Control bleeding',
                    '6. Treat for shock',
                    '7. Monitor until help arrives'
                ],
                'eye_wash_requirements': {
                    'flow_rate': '0.4 gpm minimum for 15 minutes',
                    'temperature': '60-100°F (16-38°C)',
                    'location': 'Within 10 seconds travel time',
                    'activation': 'Hands-free operation'
                }
            }
        }
        
        self.training_requirements = {
            'general_safety': {
                'new_employee': 'General safety orientation within first day',
                'job_specific': 'Task-specific training before assignment',
                'refresher': 'Annual safety training minimum',
                'competency': 'Demonstrated understanding required'
            },
            'specialized_training': {
                'confined_space': 'Entry supervisor, entrant, attendant training',
                'fall_protection': 'Competent person and user training',
                'forklift': 'Operator certification every 3 years',
                'crane_operator': 'Certified operator required',
                'hazmat': '40-hour initial, 8-hour annual refresher',
                'first_aid_cpr': 'Certification every 2 years'
            }
        }
    
    def get_safety_info(self, topic: str, subtopic: str = None):
        """Get specific safety information"""
        if topic in self.safety_knowledge:
            if subtopic:
                return self.safety_knowledge[topic].get(subtopic, {})
            return self.safety_knowledge[topic]
        return {}
    
    def get_chemical_info(self, subtopic: str = None):
        """Get chemical safety information"""
        if subtopic:
            return self.chemical_safety.get(subtopic, {})
        return self.chemical_safety
    
    def get_environmental_info(self, subtopic: str = None):
        """Get environmental safety information"""
        if subtopic:
            return self.environmental_safety.get(subtopic, {})
        return self.environmental_safety
    
    def get_emergency_info(self, subtopic: str = None):
        """Get emergency response information"""
        if subtopic:
            return self.emergency_response.get(subtopic, {})
        return self.emergency_response
    
    def search_knowledge(self, query: str):
        """Search across all knowledge bases"""
        results = []
        query_lower = query.lower()
        
        # Search safety knowledge
        for topic, content in self.safety_knowledge.items():
            if query_lower in topic or any(query_lower in str(v) for v in content.values() if isinstance(v, (str, list))):
                results.append({
                    'category': 'Safety',
                    'topic': topic,
                    'content': content
                })
        
        # Search chemical safety
        for topic, content in self.chemical_safety.items():
            if query_lower in topic or any(query_lower in str(v) for v in content.values() if isinstance(v, (str, list))):
                results.append({
                    'category': 'Chemical Safety',
                    'topic': topic,
                    'content': content
                })
        
        return results[:10]  # Limit results