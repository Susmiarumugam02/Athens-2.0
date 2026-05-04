from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class EnvironmentAspect(models.Model):
    ASPECT_TYPE_CHOICES = [
        # Energy & Climate
        ('energy_consumption', 'Energy Consumption'),
        ('renewable_energy', 'Renewable Energy Generation'),
        ('carbon_footprint', 'Carbon Footprint'),
        ('ghg_emissions', 'GHG Emissions'),
        ('energy_efficiency', 'Energy Efficiency'),
        
        # Water Management
        ('water_consumption', 'Water Consumption'),
        ('water_quality', 'Water Quality'),
        ('wastewater_treatment', 'Wastewater Treatment'),
        ('water_recycling', 'Water Recycling'),
        ('groundwater_impact', 'Groundwater Impact'),
        
        # Waste & Materials
        ('solid_waste', 'Solid Waste Management'),
        ('hazardous_waste', 'Hazardous Waste'),
        ('e_waste', 'Electronic Waste'),
        ('construction_waste', 'Construction Waste'),
        ('circular_economy', 'Circular Economy'),
        
        # Air Quality
        ('air_emissions', 'Air Emissions'),
        ('particulate_matter', 'Particulate Matter'),
        ('voc_emissions', 'VOC Emissions'),
        ('dust_control', 'Dust Control'),
        
        # Biodiversity & Ecosystems
        ('biodiversity_impact', 'Biodiversity Impact'),
        ('habitat_protection', 'Habitat Protection'),
        ('species_conservation', 'Species Conservation'),
        ('ecosystem_services', 'Ecosystem Services'),
        ('invasive_species', 'Invasive Species Control'),
        
        # Land & Soil
        ('land_use', 'Land Use'),
        ('soil_contamination', 'Soil Contamination'),
        ('erosion_control', 'Erosion Control'),
        ('land_restoration', 'Land Restoration'),
        
        # Noise & Vibration
        ('noise_pollution', 'Noise Pollution'),
        ('vibration_impact', 'Vibration Impact'),
        
        # Chemical Management
        ('chemical_storage', 'Chemical Storage'),
        ('chemical_spills', 'Chemical Spills'),
        ('pesticide_use', 'Pesticide Use'),
        
        # Environmental Compliance
        ('regulatory_compliance', 'Regulatory Compliance'),
        ('environmental_permits', 'Environmental Permits'),
        ('impact_assessment', 'Environmental Impact Assessment'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='environment_aspects')
    aspect_type = models.CharField(max_length=50, choices=ASPECT_TYPE_CHOICES)
    description = models.TextField()
    
    # Risk Assessment Matrix
    severity = models.IntegerField(choices=[(1,'Low'),(2,'Medium'),(3,'High'),(4,'Critical')], validators=[MinValueValidator(1), MaxValueValidator(4)])
    likelihood = models.IntegerField(choices=[(1,'Rare'),(2,'Possible'),(3,'Likely'),(4,'Certain')], validators=[MinValueValidator(1), MaxValueValidator(4)])
    significance = models.IntegerField(editable=False)
    
    # Enhanced Environmental Data
    environmental_media = models.CharField(max_length=20, choices=[
        ('air', 'Air'), ('water', 'Water'), ('soil', 'Soil'), 
        ('noise', 'Noise'), ('visual', 'Visual'), ('multiple', 'Multiple Media')
    ], default='multiple')
    
    activity_phase = models.CharField(max_length=20, choices=[
        ('construction', 'Construction'), ('operation', 'Operation'), 
        ('maintenance', 'Maintenance'), ('decommissioning', 'Decommissioning')
    ], default='operation')
    
    regulatory_framework = models.JSONField(default=list, help_text='Applicable regulations and standards')
    mitigation_measures = models.JSONField(default=list, help_text='Mitigation and control measures')
    monitoring_requirements = models.JSONField(default=list, help_text='Monitoring and measurement requirements')
    
    # Quantitative Metrics
    baseline_value = models.DecimalField(max_digits=15, decimal_places=3, null=True, blank=True)
    target_value = models.DecimalField(max_digits=15, decimal_places=3, null=True, blank=True)
    current_value = models.DecimalField(max_digits=15, decimal_places=3, null=True, blank=True)
    unit_of_measure = models.CharField(max_length=50, blank=True)
    
    # Compliance & Certification
    iso_14001_relevant = models.BooleanField(default=False)
    legal_requirement = models.BooleanField(default=False)
    stakeholder_concern = models.BooleanField(default=False)
    
    # Legacy field for backward compatibility
    controls = models.JSONField(default=list)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Enhanced significance calculation
        base_significance = self.severity * self.likelihood
        
        # Apply multipliers for enhanced risk assessment
        multiplier = 1.0
        if self.legal_requirement:
            multiplier += 0.5
        if self.stakeholder_concern:
            multiplier += 0.3
        if self.iso_14001_relevant:
            multiplier += 0.2
            
        self.significance = int(base_significance * multiplier)
        super().save(*args, **kwargs)
        
    @property
    def risk_level(self):
        if self.significance <= 4:
            return 'Low'
        elif self.significance <= 8:
            return 'Medium'
        elif self.significance <= 12:
            return 'High'
        else:
            return 'Critical'
            
    @property
    def compliance_status(self):
        if not self.target_value or not self.current_value:
            return 'Not Measured'
        
        if self.current_value <= self.target_value:
            return 'Compliant'
        elif self.current_value <= self.target_value * 1.1:
            return 'Warning'
        else:
            return 'Non-Compliant'

    def __str__(self):
        return f"{self.get_aspect_type_display()} - {self.site.projectName}"

class GenerationData(models.Model):
    ASSET_TYPE_CHOICES = [
        ('wind', 'Wind Turbine'),
        ('solar_pv', 'Solar PV'),
        ('solar_thermal', 'Solar Thermal'),
        ('battery_storage', 'Battery Storage'),
        ('grid_connection', 'Grid Connection'),
        ('hydroelectric', 'Hydroelectric'),
        ('biomass', 'Biomass'),
        ('geothermal', 'Geothermal'),
        ('fuel_cell', 'Fuel Cell'),
        ('hybrid_system', 'Hybrid System'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='generation_data')
    asset_id = models.CharField(max_length=100)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    timestamp = models.DateTimeField()
    
    # Enhanced Energy Metrics
    kwh_generated = models.DecimalField(max_digits=12, decimal_places=2)
    kwh_consumed = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    kwh_exported = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Performance Metrics
    capacity_mw = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    capacity_factor = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    availability_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    
    # Environmental Impact
    co2_avoided_kg = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    water_saved_liters = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Weather & Conditions
    weather_conditions = models.JSONField(default=dict, help_text='Weather data during generation')
    
    # Legacy field for backward compatibility
    kwh = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    source_tag = models.CharField(max_length=100, blank=True)
    imported_via = models.CharField(max_length=50, default='manual')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Backward compatibility
        if self.kwh and not self.kwh_generated:
            self.kwh_generated = self.kwh
        
        # Calculate CO2 avoided (0.82 kg CO2/kWh grid emission factor)
        if not self.co2_avoided_kg:
            self.co2_avoided_kg = self.kwh_generated * 0.82
            
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            models.Index(fields=['site', 'timestamp']),
            models.Index(fields=['asset_id', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.asset_id} - {self.kwh} kWh"

class EmissionFactor(models.Model):
    source = models.CharField(max_length=100)
    factor_value = models.DecimalField(max_digits=10, decimal_places=6)
    unit = models.CharField(max_length=50)
    scope = models.CharField(max_length=10, choices=[('scope1', 'Scope 1'), ('scope2', 'Scope 2'), ('scope3', 'Scope 3')])
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.source} - {self.factor_value} {self.unit}"

class GHGActivity(models.Model):
    SCOPE_CHOICES = [
        ('scope1', 'Scope 1 - Direct Emissions'),
        ('scope2', 'Scope 2 - Indirect Energy'),
        ('scope3', 'Scope 3 - Other Indirect'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='ghg_activities')
    period_start = models.DateField()
    period_end = models.DateField()
    category_scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    activity_type = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    uom = models.CharField(max_length=20)
    emission_factor = models.ForeignKey(EmissionFactor, on_delete=models.CASCADE)
    ghg_co2e = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    evidence_ids = models.JSONField(default=list)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.ghg_co2e = self.quantity * self.emission_factor.factor_value
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.activity_type} - {self.ghg_co2e} tCO2e"

class WasteManifest(models.Model):
    WASTE_CATEGORY_CHOICES = [
        ('hazardous', 'Hazardous Waste'),
        ('non_hazardous', 'Non-Hazardous Waste'),
        ('e_waste', 'Electronic Waste'),
        ('construction', 'Construction & Demolition'),
        ('organic', 'Organic Waste'),
        ('recyclable', 'Recyclable Materials'),
        ('medical', 'Medical Waste'),
        ('chemical', 'Chemical Waste'),
    ]
    
    STATUS_CHOICES = [
        ('generated', 'Generated'),
        ('stored', 'Stored On-Site'),
        ('collected', 'Collected'),
        ('transported', 'In Transport'),
        ('received', 'Received at TSDF'),
        ('treated', 'Treated'),
        ('disposed', 'Disposed'),
        ('recycled', 'Recycled'),
        ('recovered', 'Energy Recovered'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='waste_manifests')
    
    # Enhanced Waste Classification
    waste_category = models.CharField(max_length=20, choices=WASTE_CATEGORY_CHOICES)
    waste_type = models.CharField(max_length=100)
    waste_code = models.CharField(max_length=20, blank=True, help_text='Regulatory waste code')
    
    # Quantity & Measurement
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    uom = models.CharField(max_length=20, choices=[
        ('kg', 'Kilograms'), ('tonnes', 'Tonnes'), ('liters', 'Liters'),
        ('m3', 'Cubic Meters'), ('pieces', 'Pieces')
    ])
    
    # Lifecycle Tracking
    generated_date = models.DateTimeField()
    stored_since = models.DateTimeField()
    collection_date = models.DateTimeField(null=True, blank=True)
    disposal_date = models.DateTimeField(null=True, blank=True)
    
    # Parties Involved
    generator_details = models.JSONField(default=dict)
    transporter = models.ForeignKey('worker.Worker', on_delete=models.SET_NULL, null=True, blank=True)
    tsdf_facility = models.CharField(max_length=200)
    tsdf_license = models.CharField(max_length=100)
    
    # Documentation
    manifest_number = models.CharField(max_length=50, unique=True)
    manifest_docs = models.JSONField(default=list)
    certificates = models.JSONField(default=list, help_text='Treatment/disposal certificates')
    
    # Status & Compliance
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generated')
    regulatory_compliance = models.BooleanField(default=True)
    
    # Environmental Impact
    carbon_footprint_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    recycling_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.manifest_number:
            from django.utils import timezone
            self.manifest_number = f"WM-{timezone.now().strftime('%Y%m%d')}-{self.pk or '000'}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.waste_type} - {self.quantity} {self.uom}"

class BiodiversityEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('species_sighting', 'Species Sighting'),
        ('habitat_disturbance', 'Habitat Disturbance'),
        ('wildlife_collision', 'Wildlife Collision'),
        ('nesting_activity', 'Nesting Activity'),
        ('migration_pattern', 'Migration Pattern'),
        ('invasive_species', 'Invasive Species'),
        ('vegetation_impact', 'Vegetation Impact'),
        ('water_body_impact', 'Water Body Impact'),
        ('restoration_activity', 'Restoration Activity'),
    ]
    
    SEVERITY_CHOICES = [
        (1, 'Low - Minimal Impact'),
        (2, 'Medium - Moderate Impact'),
        (3, 'High - Significant Impact'),
        (4, 'Critical - Severe Impact'),
    ]
    
    CONSERVATION_STATUS_CHOICES = [
        ('LC', 'Least Concern'),
        ('NT', 'Near Threatened'),
        ('VU', 'Vulnerable'),
        ('EN', 'Endangered'),
        ('CR', 'Critically Endangered'),
        ('EW', 'Extinct in Wild'),
        ('EX', 'Extinct'),
        ('DD', 'Data Deficient'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='biodiversity_events')
    
    # Event Classification
    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)
    
    # Species Information
    species_common_name = models.CharField(max_length=100)
    species_scientific_name = models.CharField(max_length=150, blank=True)
    conservation_status = models.CharField(max_length=2, choices=CONSERVATION_STATUS_CHOICES, blank=True)
    endemic_species = models.BooleanField(default=False)
    
    # Temporal Data
    date = models.DateField()
    time = models.TimeField()
    season = models.CharField(max_length=20, choices=[
        ('spring', 'Spring'), ('summer', 'Summer'), 
        ('autumn', 'Autumn'), ('winter', 'Winter')
    ], blank=True)
    
    # Spatial Data
    location_description = models.CharField(max_length=200)
    gps_coordinates = models.CharField(max_length=50, blank=True)
    habitat_type = models.CharField(max_length=50, choices=[
        ('forest', 'Forest'), ('grassland', 'Grassland'), ('wetland', 'Wetland'),
        ('desert', 'Desert'), ('marine', 'Marine'), ('freshwater', 'Freshwater'),
        ('urban', 'Urban'), ('agricultural', 'Agricultural')
    ], blank=True)
    
    # Impact Assessment
    severity = models.IntegerField(choices=SEVERITY_CHOICES)
    population_affected = models.IntegerField(null=True, blank=True)
    area_affected_hectares = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Response & Mitigation
    immediate_actions = models.TextField()
    mitigation_measures = models.JSONField(default=list)
    monitoring_required = models.BooleanField(default=False)
    restoration_needed = models.BooleanField(default=False)
    
    # Documentation
    photos = models.JSONField(default=list)
    expert_consultation = models.BooleanField(default=False)
    regulatory_notification = models.BooleanField(default=False)
    
    # Legacy field for backward compatibility
    species = models.CharField(max_length=100, blank=True)
    location_geo = models.CharField(max_length=100, blank=True)
    actions_taken = models.TextField(blank=True)
    
    related_incident = models.ForeignKey('incidentmanagement.Incident', null=True, blank=True, on_delete=models.SET_NULL)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Backward compatibility
        if not self.species and self.species_common_name:
            self.species = self.species_common_name
        if not self.location_geo and self.location_description:
            self.location_geo = self.location_description
        if not self.actions_taken and self.immediate_actions:
            self.actions_taken = self.immediate_actions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.species} - {self.date}"

class ESGPolicy(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]
    
    title = models.CharField(max_length=255)
    version = models.CharField(max_length=20)
    effective_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    document = models.FileField(upload_to='esg_policies/')
    mapped_iso_clauses = models.JSONField(default=list)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} v{self.version}"

class Grievance(models.Model):
    SOURCE_CHOICES = [
        ('worker', 'Worker'),
        ('community', 'Community'),
        ('contractor', 'Contractor'),
        ('supplier', 'Supplier'),
        ('ngo', 'NGO/Civil Society'),
        ('government', 'Government Agency'),
        ('anonymous', 'Anonymous'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Under Investigation'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    type = models.CharField(max_length=100)
    description = models.TextField()
    anonymous_flag = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolution_date = models.DateTimeField(null=True, blank=True)
    evidence_ids = models.JSONField(default=list)
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='grievances')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.status}"

# === ADVANCED ENVIRONMENTAL TRACKING MODELS ===

class EnvironmentalMonitoring(models.Model):
    """Comprehensive environmental monitoring data"""
    PARAMETER_CHOICES = [
        # Air Quality
        ('pm25', 'PM2.5 Particulate Matter'),
        ('pm10', 'PM10 Particulate Matter'),
        ('so2', 'Sulfur Dioxide'),
        ('no2', 'Nitrogen Dioxide'),
        ('co', 'Carbon Monoxide'),
        ('o3', 'Ozone'),
        ('voc', 'Volatile Organic Compounds'),
        
        # Water Quality
        ('ph', 'pH Level'),
        ('turbidity', 'Turbidity'),
        ('dissolved_oxygen', 'Dissolved Oxygen'),
        ('bod', 'Biochemical Oxygen Demand'),
        ('cod', 'Chemical Oxygen Demand'),
        ('tss', 'Total Suspended Solids'),
        ('heavy_metals', 'Heavy Metals'),
        
        # Noise
        ('noise_day', 'Daytime Noise Level'),
        ('noise_night', 'Nighttime Noise Level'),
        ('vibration', 'Vibration Level'),
        
        # Soil
        ('soil_ph', 'Soil pH'),
        ('soil_contamination', 'Soil Contamination'),
        ('soil_erosion', 'Soil Erosion Rate'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='environmental_monitoring')
    parameter = models.CharField(max_length=30, choices=PARAMETER_CHOICES)
    measurement_date = models.DateTimeField()
    value = models.DecimalField(max_digits=15, decimal_places=6)
    unit = models.CharField(max_length=20)
    
    # Location & Context
    monitoring_station = models.CharField(max_length=100)
    gps_coordinates = models.CharField(max_length=50, blank=True)
    weather_conditions = models.JSONField(default=dict)
    
    # Compliance
    regulatory_limit = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    compliance_status = models.CharField(max_length=20, choices=[
        ('compliant', 'Compliant'),
        ('warning', 'Warning Level'),
        ('exceeded', 'Limit Exceeded'),
        ('critical', 'Critical Level')
    ], default='compliant')
    
    # Quality Assurance
    measurement_method = models.CharField(max_length=100)
    equipment_used = models.CharField(max_length=100)
    calibration_date = models.DateField(null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['site', 'parameter', 'measurement_date']),
        ]
    
    def save(self, *args, **kwargs):
        if self.regulatory_limit and self.value:
            if self.value <= self.regulatory_limit:
                self.compliance_status = 'compliant'
            elif self.value <= self.regulatory_limit * 1.1:
                self.compliance_status = 'warning'
            elif self.value <= self.regulatory_limit * 1.5:
                self.compliance_status = 'exceeded'
            else:
                self.compliance_status = 'critical'
        super().save(*args, **kwargs)

class CarbonFootprint(models.Model):
    """Comprehensive carbon footprint tracking"""
    SCOPE_CHOICES = [
        ('scope1', 'Scope 1 - Direct Emissions'),
        ('scope2', 'Scope 2 - Indirect Energy'),
        ('scope3', 'Scope 3 - Other Indirect'),
    ]
    
    CATEGORY_CHOICES = [
        # Scope 1
        ('fuel_combustion', 'Fuel Combustion'),
        ('process_emissions', 'Process Emissions'),
        ('fugitive_emissions', 'Fugitive Emissions'),
        
        # Scope 2
        ('purchased_electricity', 'Purchased Electricity'),
        ('purchased_steam', 'Purchased Steam/Heat'),
        
        # Scope 3
        ('business_travel', 'Business Travel'),
        ('employee_commuting', 'Employee Commuting'),
        ('waste_disposal', 'Waste Disposal'),
        ('water_treatment', 'Water Treatment'),
        ('purchased_goods', 'Purchased Goods & Services'),
        ('transportation', 'Transportation & Distribution'),
        ('use_of_products', 'Use of Sold Products'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='carbon_footprint')
    reporting_period_start = models.DateField()
    reporting_period_end = models.DateField()
    
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    
    # Activity Data
    activity_description = models.TextField()
    activity_amount = models.DecimalField(max_digits=15, decimal_places=3)
    activity_unit = models.CharField(max_length=20)
    
    # Emission Factors
    emission_factor = models.DecimalField(max_digits=10, decimal_places=6)
    emission_factor_source = models.CharField(max_length=100)
    emission_factor_unit = models.CharField(max_length=50)
    
    # Results
    co2_equivalent_tonnes = models.DecimalField(max_digits=15, decimal_places=3)
    uncertainty_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Verification
    verified = models.BooleanField(default=False)
    verification_body = models.CharField(max_length=100, blank=True)
    verification_date = models.DateField(null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.co2_equivalent_tonnes:
            self.co2_equivalent_tonnes = self.activity_amount * self.emission_factor
        super().save(*args, **kwargs)

class WaterManagement(models.Model):
    """Comprehensive water management tracking"""
    WATER_SOURCE_CHOICES = [
        ('municipal', 'Municipal Supply'),
        ('groundwater', 'Groundwater'),
        ('surface_water', 'Surface Water'),
        ('rainwater', 'Rainwater Harvesting'),
        ('recycled', 'Recycled Water'),
        ('desalinated', 'Desalinated Water'),
    ]
    
    USAGE_TYPE_CHOICES = [
        ('domestic', 'Domestic Use'),
        ('industrial', 'Industrial Process'),
        ('cooling', 'Cooling Systems'),
        ('irrigation', 'Irrigation'),
        ('construction', 'Construction Activities'),
        ('fire_safety', 'Fire Safety Systems'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='water_management')
    
    # Water Consumption
    measurement_date = models.DateField()
    water_source = models.CharField(max_length=20, choices=WATER_SOURCE_CHOICES)
    usage_type = models.CharField(max_length=20, choices=USAGE_TYPE_CHOICES)
    
    volume_consumed_liters = models.DecimalField(max_digits=12, decimal_places=2)
    volume_recycled_liters = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    volume_discharged_liters = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Water Quality
    quality_parameters = models.JSONField(default=dict, help_text='Water quality test results')
    treatment_applied = models.JSONField(default=list, help_text='Water treatment methods')
    
    # Efficiency Metrics
    water_intensity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, help_text='Liters per unit of production')
    recycling_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Compliance
    discharge_permit_number = models.CharField(max_length=50, blank=True)
    regulatory_compliance = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if self.volume_consumed_liters and self.volume_recycled_liters:
            self.recycling_rate = (self.volume_recycled_liters / self.volume_consumed_liters) * 100
        super().save(*args, **kwargs)

class EnergyManagement(models.Model):
    """Comprehensive energy management tracking"""
    ENERGY_TYPE_CHOICES = [
        ('electricity_grid', 'Grid Electricity'),
        ('electricity_renewable', 'Renewable Electricity'),
        ('natural_gas', 'Natural Gas'),
        ('diesel', 'Diesel'),
        ('petrol', 'Petrol'),
        ('lpg', 'LPG'),
        ('coal', 'Coal'),
        ('biomass', 'Biomass'),
        ('solar', 'Solar Energy'),
        ('wind', 'Wind Energy'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='energy_management')
    
    # Energy Consumption
    measurement_date = models.DateField()
    energy_type = models.CharField(max_length=25, choices=ENERGY_TYPE_CHOICES)
    consumption_amount = models.DecimalField(max_digits=12, decimal_places=3)
    consumption_unit = models.CharField(max_length=20, choices=[
        ('kwh', 'kWh'), ('mwh', 'MWh'), ('gj', 'GJ'), 
        ('liters', 'Liters'), ('kg', 'Kilograms'), ('m3', 'Cubic Meters')
    ])
    
    # Cost & Efficiency
    cost_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    energy_intensity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    
    # Renewable Energy
    renewable_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    green_certificate_number = models.CharField(max_length=50, blank=True)
    
    # Emissions
    co2_emissions_kg = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    emission_factor_used = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class EnvironmentalIncident(models.Model):
    """Environmental incidents and near-misses"""
    INCIDENT_TYPE_CHOICES = [
        ('spill', 'Chemical/Oil Spill'),
        ('emission', 'Uncontrolled Emission'),
        ('waste', 'Waste Management Incident'),
        ('water', 'Water Pollution'),
        ('noise', 'Noise Violation'),
        ('wildlife', 'Wildlife Impact'),
        ('soil', 'Soil Contamination'),
        ('air', 'Air Quality Incident'),
    ]
    
    SEVERITY_CHOICES = [
        (1, 'Minor - No environmental impact'),
        (2, 'Moderate - Limited environmental impact'),
        (3, 'Major - Significant environmental impact'),
        (4, 'Critical - Severe environmental damage'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='environmental_incidents')
    
    # Incident Details
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPE_CHOICES)
    incident_date = models.DateTimeField()
    location_description = models.CharField(max_length=200)
    gps_coordinates = models.CharField(max_length=50, blank=True)
    
    # Impact Assessment
    severity = models.IntegerField(choices=SEVERITY_CHOICES)
    environmental_media_affected = models.JSONField(default=list)
    estimated_impact_area = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Response
    immediate_actions = models.TextField()
    containment_measures = models.TextField()
    cleanup_required = models.BooleanField(default=False)
    regulatory_notification = models.BooleanField(default=False)
    
    # Investigation
    root_cause = models.TextField(blank=True)
    corrective_actions = models.JSONField(default=list)
    preventive_actions = models.JSONField(default=list)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('open', 'Open'),
        ('investigating', 'Under Investigation'),
        ('remediation', 'Remediation in Progress'),
        ('closed', 'Closed')
    ], default='open')
    
    closure_date = models.DateTimeField(null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SustainabilityTarget(models.Model):
    """Sustainability targets and KPIs"""
    TARGET_CATEGORY_CHOICES = [
        ('carbon', 'Carbon Reduction'),
        ('energy', 'Energy Efficiency'),
        ('water', 'Water Conservation'),
        ('waste', 'Waste Reduction'),
        ('biodiversity', 'Biodiversity Protection'),
        ('renewable', 'Renewable Energy'),
    ]
    
    site = models.ForeignKey('authentication.Project', on_delete=models.CASCADE, related_name='sustainability_targets')
    
    # Target Definition
    category = models.CharField(max_length=20, choices=TARGET_CATEGORY_CHOICES)
    target_name = models.CharField(max_length=200)
    description = models.TextField()
    
    # Metrics
    baseline_value = models.DecimalField(max_digits=15, decimal_places=3)
    target_value = models.DecimalField(max_digits=15, decimal_places=3)
    current_value = models.DecimalField(max_digits=15, decimal_places=3, default=0)
    unit_of_measure = models.CharField(max_length=50)
    
    # Timeline
    baseline_year = models.IntegerField()
    target_year = models.IntegerField()
    
    # Progress Tracking
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    on_track = models.BooleanField(default=True)
    
    # Alignment
    sdg_alignment = models.JSONField(default=list, help_text='UN SDG goals alignment')
    paris_agreement_aligned = models.BooleanField(default=False)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if self.baseline_value and self.target_value and self.current_value:
            progress = ((self.baseline_value - self.current_value) / (self.baseline_value - self.target_value)) * 100
            self.progress_percentage = max(0, min(100, progress))
            self.on_track = self.progress_percentage >= 80  # 80% threshold for being on track
        super().save(*args, **kwargs)