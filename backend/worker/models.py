from django.db import models
from django.core.validators import RegexValidator
from django.conf import settings

class Worker(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_leave', 'On Leave'),
    )
    
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )
    
    EMPLOYMENT_TYPE_CHOICES = (
        ('temporary', 'Temporary'),
        ('permanent', 'Permanent'),
    )
    
    EMPLOYMENT_STATUS_CHOICES = (
        ('initiated', 'Initiated'),
        ('deployed', 'Deployed'),
        ('terminated', 'Terminated'),
        ('site_transferred', 'Site Transferred'),
    )
    
    CATEGORY_CHOICES = (
        ('Highly Skilled', 'Highly Skilled'),
        ('Skilled', 'Skilled'),
        ('Semi Skilled', 'Semi Skilled'),
        ('Unskilled', 'Unskilled'),
    )

    DEPARTMENT_CHOICES = (
        ('Production / Manufacturing', 'Production / Manufacturing'),
        ('Maintenance', 'Maintenance'),
        ('Quality Control / Quality Assurance (QC/QA)', 'Quality Control / Quality Assurance (QC/QA)'),
        ('EHS (Environment, Health & Safety)', 'EHS (Environment, Health & Safety)'),
        ('Utilities & Facility Management', 'Utilities & Facility Management'),
        ('Research & Development / Design & Engineering', 'Research & Development / Design & Engineering'),
        ('Packaging & Labeling', 'Packaging & Labeling'),
        ('Logistics / Stores / Supply Chain', 'Logistics / Stores / Supply Chain'),
        ('Fire Safety & Emergency Response', 'Fire Safety & Emergency Response'),
        ('HR & Administration', 'HR & Administration'),
    )

    DESIGNATION_CHOICES = (
        # Production / Manufacturing
        ('Production Manager', 'Production Manager'),
        ('Production Supervisor / Shift In-charge', 'Production Supervisor / Shift In-charge'),
        ('Line Leader / Assembly Line Leader', 'Line Leader / Assembly Line Leader'),
        ('Machine Operator', 'Machine Operator'),
        ('Assembly Technician / Production Helper', 'Assembly Technician / Production Helper'),
        ('Batch Maker / Process Operator', 'Batch Maker / Process Operator'),

        # Maintenance
        ('Maintenance Manager', 'Maintenance Manager'),
        ('Mechanical Maintenance Engineer / Technician', 'Mechanical Maintenance Engineer / Technician'),
        ('Electrical Maintenance Engineer / Technician', 'Electrical Maintenance Engineer / Technician'),
        ('Utility Maintenance Technician', 'Utility Maintenance Technician'),
        ('Preventive Maintenance Planner', 'Preventive Maintenance Planner'),

        # Quality Control / Quality Assurance (QC/QA)
        ('QA/QC Manager', 'QA/QC Manager'),
        ('QA/QC Engineer', 'QA/QC Engineer'),
        ('Quality Inspector', 'Quality Inspector'),
        ('Lab Analyst / QC Chemist / Microbiologist', 'Lab Analyst / QC Chemist / Microbiologist'),
        ('Calibration Technician', 'Calibration Technician'),

        # EHS (Environment, Health & Safety)
        ('EHS Manager / HSE Lead', 'EHS Manager / HSE Lead'),
        ('Safety Officer', 'Safety Officer'),
        ('Environmental Engineer / Compliance Officer', 'Environmental Engineer / Compliance Officer'),
        ('Fire Safety Officer / Fire & Emergency Coordinator', 'Fire Safety Officer / Fire & Emergency Coordinator'),
        ('Chemical Safety Officer / Waste Management Officer', 'Chemical Safety Officer / Waste Management Officer'),
        ('PPE Compliance Checker', 'PPE Compliance Checker'),

        # Utilities & Facility Management
        ('Utility Manager', 'Utility Manager'),
        ('Boiler Operator', 'Boiler Operator'),
        ('Chiller / Compressor / HVAC Technician', 'Chiller / Compressor / HVAC Technician'),
        ('Water Treatment Plant (WTP/ETP) Operator', 'Water Treatment Plant (WTP/ETP) Operator'),
        ('Electrical Technician (Facility)', 'Electrical Technician (Facility)'),

        # Research & Development / Design & Engineering
        ('R&D Manager', 'R&D Manager'),
        ('Design Engineer / CAD Engineer', 'Design Engineer / CAD Engineer'),
        ('Product Development Engineer', 'Product Development Engineer'),
        ('Testing / Prototype Engineer', 'Testing / Prototype Engineer'),
        ('Firmware / Hardware Engineer (Electronics)', 'Firmware / Hardware Engineer (Electronics)'),

        # Packaging & Labeling
        ('Packaging Manager', 'Packaging Manager'),
        ('Packing Supervisor', 'Packing Supervisor'),
        ('Machine Operator – Packing', 'Machine Operator – Packing'),
        ('Labeling & Coding Technician', 'Labeling & Coding Technician'),
        ('Artwork Coordinator', 'Artwork Coordinator'),

        # Logistics / Stores / Supply Chain
        ('Supply Chain Manager', 'Supply Chain Manager'),
        ('Logistics Coordinator', 'Logistics Coordinator'),
        ('Store Keeper / Inventory Controller', 'Store Keeper / Inventory Controller'),
        ('Warehouse In-charge / Assistant', 'Warehouse In-charge / Assistant'),
        ('Material Handler / Forklift Operator', 'Material Handler / Forklift Operator'),

        # Fire Safety & Emergency Response
        ('Fire Safety In-charge', 'Fire Safety In-charge'),
        ('Emergency Response Technician / Fireman', 'Emergency Response Technician / Fireman'),
        ('Fire Drill / Rescue Coordinator', 'Fire Drill / Rescue Coordinator'),
        ('First Aider', 'First Aider'),
        ('Extinguisher / Alarm Technician', 'Extinguisher / Alarm Technician'),

        # HR & Administration
        ('HR Manager / HR Executive', 'HR Manager / HR Executive'),
        ('Admin Officer', 'Admin Officer'),
        ('Training & Development Coordinator', 'Training & Development Coordinator'),
        ('Time Office In-charge / Attendance Clerk', 'Time Office In-charge / Attendance Clerk'),
        ('Worker Welfare / Compliance Officer', 'Worker Welfare / Compliance Officer'),
    )

    EDUCATION_CHOICES = (
        ('No Formal Education', 'No Formal Education'),
        ('High School Diploma / Equivalent', 'High School Diploma / Equivalent'),
        ('Vocational Training / Certification', 'Vocational Training / Certification'),
        ('Associate Degree', 'Associate Degree'),
        ('Bachelor\'s Degree', 'Bachelor\'s Degree'),
        ('Master\'s Degree', 'Master\'s Degree'),
        ('Doctorate / PhD', 'Doctorate / PhD'),
        ('Other', 'Other'),
    )
    
    # Multi-tenant isolation field - MANDATORY
    athens_tenant_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Athens tenant identifier for multi-tenant isolation"
    )
    
    # Basic Information
    worker_id = models.CharField(max_length=50, unique=True, editable=False)
    name = models.CharField(max_length=100, validators=[RegexValidator(r'^[A-Za-z\s]+$')])
    surname = models.CharField(max_length=100, validators=[RegexValidator(r'^[A-Za-z\s]+$')])
    father_or_spouse_name = models.CharField(max_length=100, validators=[RegexValidator(r'^[A-Za-z\s]+$')])
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    nationality = models.CharField(max_length=50, default='Indian')
    
    # Education
    education_level = models.CharField(max_length=100, choices=EDUCATION_CHOICES)
    education_other = models.CharField(max_length=100, blank=True, null=True)
    
    # Employment Details
    date_of_joining = models.DateField()
    designation = models.CharField(max_length=200, choices=DESIGNATION_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default='temporary')
    department = models.CharField(max_length=200, choices=DEPARTMENT_CHOICES)
    
    # Contact Information
    phone_number = models.CharField(
        max_length=15,
        unique=True,
        validators=[RegexValidator(r'^[6-9]\d{9}$', message='Enter a valid 10-digit Indian mobile number')],
        help_text='10-digit Indian mobile number starting with 6, 7, 8, or 9'
    )
    present_address = models.TextField()
    permanent_address = models.TextField()

    # Identification Documents (Enhanced with uniqueness and better validation)
    aadhaar = models.CharField(
        max_length=12,
        unique=True,
        validators=[RegexValidator(r'^\d{12}$', message='Aadhaar must be exactly 12 digits')],
        help_text='12-digit Aadhaar number (required and unique)'
    )
    pan = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        unique=True,
        validators=[RegexValidator(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', message='Invalid PAN format (e.g., ABCDE1234F)')],
        help_text='10-character PAN number (optional but unique if provided)'
    )
    uan = models.CharField(
        max_length=12,
        blank=True,
        null=True,
        unique=True,
        validators=[RegexValidator(r'^\d{12}$', message='UAN must be exactly 12 digits')],
        help_text='12-digit UAN number (optional but unique if provided)'
    )
    esic_ip = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        help_text='ESIC IP number (optional but unique if provided)'
    )
    lwf = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Labour Welfare Fund number (optional)'
    )
    mark_of_identification = models.CharField(
        max_length=200,
        help_text='Physical identification mark (e.g., mole on right cheek, scar on left hand)'
    )
    
    # Photo
    photo = models.ImageField(upload_to='worker_photos/', blank=True, null=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Employment Status
    employment_status = models.CharField(
        max_length=20, 
        choices=EMPLOYMENT_STATUS_CHOICES, 
        default='initiated'
    )
    
    # Project relationship
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='workers',
        null=True,
        blank=True
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        null=True, 
        related_name='created_workers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        permissions = [
            ("view_all_workers", "Can view all workers"),
            ("manage_workers", "Can manage workers"),
        ]
    
    def __str__(self):
        return f"{self.name} {self.surname} ({self.worker_id})"
    
    def save(self, *args, **kwargs):
        # Auto-generate worker_id if not provided
        if not self.worker_id:
            last_worker = Worker.objects.order_by('-id').first()
            if last_worker:
                try:
                    last_id = int(last_worker.worker_id.split('-')[-1])
                    self.worker_id = f"WRK-{last_id + 1:04d}"
                except (ValueError, IndexError):
                    self.worker_id = "WRK-0001"
            else:
                self.worker_id = "WRK-0001"
        super().save(*args, **kwargs)
