from django.core.management.base import BaseCommand
from ptw.models import PermitType

class Command(BaseCommand):
    help = 'Create comprehensive permit types for all industrial fields'

    def handle(self, *args, **options):
        permit_types = [
            # HOT WORK PERMITS
            {'name': 'Hot Work - Arc Welding', 'category': 'hot_work', 'description': 'Electric arc welding (SMAW, GMAW, GTAW)', 'color_code': '#ff4d4f', 'risk_level': 'high', 'validity_hours': 8, 'requires_gas_testing': True, 'requires_fire_watch': True, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls'], 'min_personnel_required': 2},
            {'name': 'Hot Work - Gas Welding/Cutting', 'category': 'hot_work', 'description': 'Oxy-fuel welding and cutting', 'color_code': '#ff4d4f', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_gas_testing': True, 'requires_fire_watch': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls'], 'min_personnel_required': 2},
            {'name': 'Hot Work - Plasma Cutting', 'category': 'hot_work', 'description': 'Plasma arc cutting operations', 'color_code': '#ff7a45', 'risk_level': 'high', 'validity_hours': 8, 'requires_fire_watch': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls']},
            {'name': 'Hot Work - Grinding/Cutting', 'category': 'hot_work', 'description': 'Abrasive wheel grinding and cutting', 'color_code': '#ff7a45', 'risk_level': 'medium', 'validity_hours': 8, 'requires_fire_watch': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'face_shield']},
            {'name': 'Hot Work - Brazing/Soldering', 'category': 'hot_work', 'description': 'Brazing and soldering operations', 'color_code': '#ffa940', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles']},
            {'name': 'Hot Work - Thermal Lance', 'category': 'hot_work', 'description': 'Thermal lance cutting operations', 'color_code': '#ff4d4f', 'risk_level': 'extreme', 'validity_hours': 4, 'requires_fire_watch': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls', 'respirator'], 'min_personnel_required': 3},

            # CONFINED SPACE PERMITS
            {'name': 'Confined Space - Tank Entry', 'category': 'confined_space', 'description': 'Entry into storage tanks and vessels', 'color_code': '#722ed1', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_gas_testing': True, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'respirator'], 'min_personnel_required': 3},
            {'name': 'Confined Space - Manhole Entry', 'category': 'confined_space', 'description': 'Entry into manholes and underground spaces', 'color_code': '#722ed1', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_gas_testing': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'respirator'], 'min_personnel_required': 3},
            {'name': 'Confined Space - Vessel Entry', 'category': 'confined_space', 'description': 'Entry into pressure vessels and reactors', 'color_code': '#722ed1', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_gas_testing': True, 'requires_isolation': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'respirator', 'coveralls'], 'min_personnel_required': 4},
            {'name': 'Confined Space - Sewer Entry', 'category': 'confined_space', 'description': 'Entry into sewers and drainage systems', 'color_code': '#9254de', 'risk_level': 'extreme', 'validity_hours': 6, 'requires_gas_testing': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'respirator', 'chemical_suit'], 'min_personnel_required': 3},
            {'name': 'Confined Space - Tunnel Work', 'category': 'confined_space', 'description': 'Work in tunnels and underground passages', 'color_code': '#9254de', 'risk_level': 'high', 'validity_hours': 8, 'requires_gas_testing': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'respirator'], 'min_personnel_required': 2},

            # ELECTRICAL WORK PERMITS
            {'name': 'Electrical - High Voltage (>1kV)', 'category': 'electrical', 'description': 'Work on HV electrical systems', 'color_code': '#fadb14', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_isolation': True, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'electrical_ppe'], 'min_personnel_required': 2},
            {'name': 'Electrical - Medium Voltage (1-35kV)', 'category': 'electrical', 'description': 'Work on MV electrical systems', 'color_code': '#fadb14', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_isolation': True, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'electrical_ppe'], 'min_personnel_required': 2},
            {'name': 'Electrical - Low Voltage (<1kV)', 'category': 'electrical', 'description': 'Work on LV electrical systems', 'color_code': '#fadb14', 'risk_level': 'high', 'validity_hours': 8, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles']},
            {'name': 'Electrical - Live Work', 'category': 'electrical', 'description': 'Work on energized equipment', 'color_code': '#ff4d4f', 'risk_level': 'extreme', 'validity_hours': 4, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'electrical_ppe', 'face_shield'], 'min_personnel_required': 2},
            {'name': 'Electrical - Cable Installation', 'category': 'electrical', 'description': 'Installation of electrical cables', 'color_code': '#fadb14', 'risk_level': 'medium', 'validity_hours': 12, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles']},
            {'name': 'Electrical - Motor/Generator Work', 'category': 'electrical', 'description': 'Work on rotating electrical machines', 'color_code': '#fadb14', 'risk_level': 'high', 'validity_hours': 8, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles']},

            # WORK AT HEIGHT PERMITS
            {'name': 'Height - Scaffolding Work', 'category': 'height', 'description': 'Work on scaffolds above 6 feet', 'color_code': '#1890ff', 'risk_level': 'high', 'validity_hours': 12, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness']},
            {'name': 'Height - Ladder Work', 'category': 'height', 'description': 'Work using ladders above 6 feet', 'color_code': '#40a9ff', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},
            {'name': 'Height - Rope Access', 'category': 'height', 'description': 'Industrial rope access work', 'color_code': '#096dd9', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'rope_access_ppe'], 'min_personnel_required': 2},
            {'name': 'Height - Aerial Platform', 'category': 'height', 'description': 'Work using aerial lifts and platforms', 'color_code': '#1890ff', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness']},
            {'name': 'Height - Tower/Mast Work', 'category': 'height', 'description': 'Work on towers and communication masts', 'color_code': '#096dd9', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness'], 'min_personnel_required': 2},
            {'name': 'Height - Roof Work', 'category': 'height', 'description': 'Work on roofs and elevated surfaces', 'color_code': '#1890ff', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness']},

            # EXCAVATION PERMITS
            {'name': 'Excavation - Manual Digging', 'category': 'excavation', 'description': 'Hand digging operations', 'color_code': '#8c8c8c', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},
            {'name': 'Excavation - Mechanical', 'category': 'excavation', 'description': 'Machine excavation operations', 'color_code': '#595959', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},
            {'name': 'Excavation - Trenching', 'category': 'excavation', 'description': 'Trench excavation work', 'color_code': '#595959', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},
            {'name': 'Excavation - Deep Excavation (>5ft)', 'category': 'excavation', 'description': 'Deep excavation requiring shoring', 'color_code': '#434343', 'risk_level': 'extreme', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis'], 'min_personnel_required': 2},
            {'name': 'Excavation - Utility Work', 'category': 'excavation', 'description': 'Excavation near utilities', 'color_code': '#8c8c8c', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},

            # CHEMICAL WORK PERMITS
            {'name': 'Chemical - Hazardous Materials', 'category': 'chemical', 'description': 'Work with hazardous chemicals', 'color_code': '#fa8c16', 'risk_level': 'high', 'validity_hours': 8, 'requires_gas_testing': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'chemical_suit', 'respirator']},
            {'name': 'Chemical - Corrosive Materials', 'category': 'chemical', 'description': 'Work with acids and bases', 'color_code': '#fa541c', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'chemical_suit', 'face_shield']},
            {'name': 'Chemical - Toxic Substances', 'category': 'chemical', 'description': 'Work with toxic materials', 'color_code': '#d4380d', 'risk_level': 'extreme', 'validity_hours': 6, 'requires_gas_testing': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'chemical_suit', 'respirator'], 'min_personnel_required': 2},
            {'name': 'Chemical - Flammable Liquids', 'category': 'chemical', 'description': 'Work with flammable chemicals', 'color_code': '#fa8c16', 'risk_level': 'high', 'validity_hours': 8, 'requires_gas_testing': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls']},
            {'name': 'Chemical - Cleaning/Decontamination', 'category': 'chemical', 'description': 'Chemical cleaning operations', 'color_code': '#fa8c16', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'chemical_suit']},

            # CRANE & LIFTING PERMITS
            {'name': 'Crane - Mobile Crane Operations', 'category': 'crane_lifting', 'description': 'Mobile crane lifting operations', 'color_code': '#52c41a', 'risk_level': 'high', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis'], 'min_personnel_required': 2},
            {'name': 'Crane - Tower Crane Operations', 'category': 'crane_lifting', 'description': 'Tower crane operations', 'color_code': '#52c41a', 'risk_level': 'high', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis'], 'min_personnel_required': 2},
            {'name': 'Crane - Overhead Crane', 'category': 'crane_lifting', 'description': 'Overhead bridge crane operations', 'color_code': '#73d13d', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},
            {'name': 'Lifting - Heavy Lift (>10 tons)', 'category': 'crane_lifting', 'description': 'Heavy lifting operations', 'color_code': '#389e0d', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis'], 'min_personnel_required': 3},
            {'name': 'Lifting - Rigging Operations', 'category': 'crane_lifting', 'description': 'Rigging and slinging operations', 'color_code': '#95de64', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},

            # SPECIALIZED PERMITS
            {'name': 'Radiography - Industrial X-Ray', 'category': 'specialized', 'description': 'Industrial radiography work', 'color_code': '#f759ab', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_training_verification': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'radiation_badge', 'lead_apron'], 'min_personnel_required': 2},
            {'name': 'Pressure Testing - Hydrostatic', 'category': 'specialized', 'description': 'Hydrostatic pressure testing', 'color_code': '#ff85c0', 'risk_level': 'high', 'validity_hours': 8, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'face_shield']},
            {'name': 'Pressure Testing - Pneumatic', 'category': 'specialized', 'description': 'Pneumatic pressure testing', 'color_code': '#ff85c0', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'face_shield'], 'min_personnel_required': 2},
            {'name': 'Asbestos - Removal/Abatement', 'category': 'specialized', 'description': 'Asbestos removal work', 'color_code': '#d3adf7', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_gas_testing': True, 'requires_medical_surveillance': True, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'respirator', 'disposable_coveralls'], 'min_personnel_required': 2},
            {'name': 'Demolition - Structural', 'category': 'specialized', 'description': 'Structural demolition work', 'color_code': '#ff7875', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls', 'respirator'], 'min_personnel_required': 3},

            # MARINE OPERATIONS
            {'name': 'Marine - Vessel Entry', 'category': 'marine', 'description': 'Entry into ship tanks and holds', 'color_code': '#1890ff', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_gas_testing': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'respirator'], 'min_personnel_required': 3},
            {'name': 'Marine - Hot Work on Vessel', 'category': 'marine', 'description': 'Hot work on ships and vessels', 'color_code': '#ff4d4f', 'risk_level': 'extreme', 'validity_hours': 6, 'requires_gas_testing': True, 'requires_fire_watch': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls'], 'min_personnel_required': 3},
            {'name': 'Marine - Cargo Operations', 'category': 'marine', 'description': 'Loading/unloading cargo operations', 'color_code': '#40a9ff', 'risk_level': 'medium', 'validity_hours': 12, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},
            {'name': 'Marine - Underwater Work', 'category': 'marine', 'description': 'Underwater inspection and repair', 'color_code': '#096dd9', 'risk_level': 'extreme', 'validity_hours': 6, 'requires_training_verification': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['diving_equipment'], 'min_personnel_required': 3},

            # DIVING OPERATIONS
            {'name': 'Diving - Commercial Diving', 'category': 'diving', 'description': 'Commercial diving operations', 'color_code': '#0050b3', 'risk_level': 'extreme', 'validity_hours': 6, 'requires_training_verification': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['diving_equipment'], 'min_personnel_required': 3},
            {'name': 'Diving - Saturation Diving', 'category': 'diving', 'description': 'Saturation diving operations', 'color_code': '#003a8c', 'risk_level': 'extreme', 'validity_hours': 24, 'requires_training_verification': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['diving_equipment'], 'min_personnel_required': 5},
            {'name': 'Diving - Hazmat Diving', 'category': 'diving', 'description': 'Diving in contaminated water', 'color_code': '#003a8c', 'risk_level': 'extreme', 'validity_hours': 4, 'requires_training_verification': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['diving_equipment', 'chemical_suit'], 'min_personnel_required': 4},

            # BLASTING & EXPLOSIVES
            {'name': 'Blasting - Surface Blasting', 'category': 'blasting', 'description': 'Surface blasting operations', 'color_code': '#ff4d4f', 'risk_level': 'extreme', 'validity_hours': 4, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'ear_protection'], 'min_personnel_required': 3},
            {'name': 'Blasting - Underground Blasting', 'category': 'blasting', 'description': 'Underground blasting operations', 'color_code': '#cf1322', 'risk_level': 'extreme', 'validity_hours': 4, 'requires_training_verification': True, 'requires_gas_testing': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'ear_protection', 'respirator'], 'min_personnel_required': 4},
            {'name': 'Explosives - Transportation', 'category': 'blasting', 'description': 'Transportation of explosives', 'color_code': '#ff7875', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes'], 'min_personnel_required': 2},

            # RADIATION WORK
            {'name': 'Radiation - Nuclear Work', 'category': 'radiation', 'description': 'Work with radioactive materials', 'color_code': '#fadb14', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_training_verification': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'radiation_badge', 'lead_apron'], 'min_personnel_required': 2},
            {'name': 'Radiation - Medical Isotopes', 'category': 'radiation', 'description': 'Work with medical radioactive sources', 'color_code': '#fadb14', 'risk_level': 'high', 'validity_hours': 8, 'requires_training_verification': True, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'radiation_badge']},

            # BIOLOGICAL HAZARDS
            {'name': 'Biological - Infectious Materials', 'category': 'biological', 'description': 'Work with infectious biological materials', 'color_code': '#52c41a', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_medical_surveillance': True, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls', 'respirator'], 'min_personnel_required': 2},
            {'name': 'Biological - Laboratory Work', 'category': 'biological', 'description': 'Biological laboratory operations', 'color_code': '#73d13d', 'risk_level': 'high', 'validity_hours': 8, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls']},

            # COLD WORK PERMITS
            {'name': 'Cold Work - General Maintenance', 'category': 'cold_work', 'description': 'General maintenance work', 'color_code': '#13c2c2', 'risk_level': 'low', 'validity_hours': 12, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},
            {'name': 'Cold Work - Mechanical Work', 'category': 'cold_work', 'description': 'Mechanical maintenance work', 'color_code': '#36cfc9', 'risk_level': 'low', 'validity_hours': 12, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles']},
            {'name': 'Cold Work - Instrumentation', 'category': 'cold_work', 'description': 'Instrument calibration and maintenance', 'color_code': '#5cdbd3', 'risk_level': 'low', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},
            {'name': 'Cold Work - Painting/Coating', 'category': 'cold_work', 'description': 'Painting and coating operations', 'color_code': '#87e8de', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'respirator']},
            {'name': 'Cold Work - Insulation Work', 'category': 'cold_work', 'description': 'Installation/removal of insulation', 'color_code': '#b5f5ec', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'respirator', 'coveralls']},

            # ADDITIONAL SPECIALIZED PERMITS
            {'name': 'Cryogenic - Liquid Nitrogen Work', 'category': 'specialized', 'description': 'Work with cryogenic materials', 'color_code': '#40a9ff', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls']},
            {'name': 'Vacuum - High Vacuum Systems', 'category': 'specialized', 'description': 'Work on high vacuum systems', 'color_code': '#722ed1', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles']},
            {'name': 'Laser - Class 4 Laser Work', 'category': 'specialized', 'description': 'Work with high-power lasers', 'color_code': '#eb2f96', 'risk_level': 'high', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'laser_goggles', 'gloves', 'shoes']},
            {'name': 'Microwave - RF/Microwave Work', 'category': 'specialized', 'description': 'Work with RF and microwave systems', 'color_code': '#f759ab', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},
            {'name': 'Noise - High Noise Environment', 'category': 'specialized', 'description': 'Work in high noise areas (>85dB)', 'color_code': '#faad14', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'ear_protection']},
            {'name': 'Vibration - High Vibration Work', 'category': 'specialized', 'description': 'Work involving high vibration tools', 'color_code': '#fa8c16', 'risk_level': 'medium', 'validity_hours': 6, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes']},
            {'name': 'Temperature - Extreme Heat Work', 'category': 'specialized', 'description': 'Work in extreme heat conditions', 'color_code': '#ff4d4f', 'risk_level': 'high', 'validity_hours': 4, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'cooling_vest']},
            {'name': 'Temperature - Extreme Cold Work', 'category': 'specialized', 'description': 'Work in extreme cold conditions', 'color_code': '#1890ff', 'risk_level': 'high', 'validity_hours': 4, 'requires_medical_surveillance': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'thermal_clothing']},

            # AIRLINE OPERATIONS
            {'name': 'Airline - Aircraft Maintenance', 'category': 'airline', 'description': 'Aircraft maintenance and inspection', 'color_code': '#1890ff', 'risk_level': 'high', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},
            {'name': 'Airline - Engine Work', 'category': 'airline', 'description': 'Aircraft engine maintenance', 'color_code': '#096dd9', 'risk_level': 'extreme', 'validity_hours': 8, 'requires_training_verification': True, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'ear_protection'], 'min_personnel_required': 2},
            {'name': 'Airline - Fuel System Work', 'category': 'airline', 'description': 'Aircraft fuel system maintenance', 'color_code': '#ff4d4f', 'risk_level': 'extreme', 'validity_hours': 6, 'requires_gas_testing': True, 'requires_fire_watch': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls'], 'min_personnel_required': 2},
            {'name': 'Airline - Avionics Work', 'category': 'airline', 'description': 'Aircraft electronics and avionics', 'color_code': '#fadb14', 'risk_level': 'medium', 'validity_hours': 8, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles']},
            {'name': 'Airline - Ground Support Equipment', 'category': 'airline', 'description': 'GSE maintenance and operation', 'color_code': '#52c41a', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},
            {'name': 'Airline - Hangar Work', 'category': 'airline', 'description': 'Work in aircraft hangars', 'color_code': '#40a9ff', 'risk_level': 'medium', 'validity_hours': 12, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},
            {'name': 'Airline - Runway/Taxiway Work', 'category': 'airline', 'description': 'Airfield pavement maintenance', 'color_code': '#8c8c8c', 'risk_level': 'high', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis', 'ear_protection']},
            {'name': 'Airline - De-icing Operations', 'category': 'airline', 'description': 'Aircraft de-icing procedures', 'color_code': '#13c2c2', 'risk_level': 'medium', 'validity_hours': 6, 'requires_training_verification': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'chemical_suit']},
            {'name': 'Airline - Cargo Loading', 'category': 'airline', 'description': 'Aircraft cargo loading operations', 'color_code': '#73d13d', 'risk_level': 'medium', 'validity_hours': 8, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis']},
            {'name': 'Airline - Hydraulic System Work', 'category': 'airline', 'description': 'Aircraft hydraulic system maintenance', 'color_code': '#fa8c16', 'risk_level': 'high', 'validity_hours': 8, 'requires_isolation': True, 'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls']},
        ]

        created_count = 0
        for permit_data in permit_types:
            permit_type, created = PermitType.objects.get_or_create(
                name=permit_data['name'],
                defaults=permit_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created: {permit_type.name}")
            else:
                for key, value in permit_data.items():
                    setattr(permit_type, key, value)
                permit_type.save()
                self.stdout.write(f"Updated: {permit_type.name}")

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created/updated {len(permit_types)} permit types ({created_count} new)')
        )