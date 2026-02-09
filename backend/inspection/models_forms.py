from django.db import models
from django.conf import settings
from .models import Inspection
import uuid

class ACCableInspectionForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='ac_cable_form')
    
    # Basic Info
    contractor = models.CharField(max_length=200)
    date = models.DateField()
    block_no = models.CharField(max_length=100)
    work_description = models.CharField(max_length=200, default='AC Cable Laying (Testing)')
    ref_drg_no = models.CharField(max_length=100, blank=True)
    cable_size = models.CharField(max_length=100, blank=True)
    from_to = models.CharField(max_length=200, blank=True)
    
    # Instrument Details (3 instruments)
    instrument_make_0 = models.CharField(max_length=100, blank=True)
    instrument_range_0 = models.CharField(max_length=100, blank=True)
    instrument_serial_0 = models.CharField(max_length=100, blank=True)
    instrument_calibration_0 = models.CharField(max_length=100, blank=True)
    
    instrument_make_1 = models.CharField(max_length=100, blank=True)
    instrument_range_1 = models.CharField(max_length=100, blank=True)
    instrument_serial_1 = models.CharField(max_length=100, blank=True)
    instrument_calibration_1 = models.CharField(max_length=100, blank=True)
    
    instrument_make_2 = models.CharField(max_length=100, blank=True)
    instrument_range_2 = models.CharField(max_length=100, blank=True)
    instrument_serial_2 = models.CharField(max_length=100, blank=True)
    instrument_calibration_2 = models.CharField(max_length=100, blank=True)
    
    # Test Report
    test_0 = models.TextField(blank=True)  # IR Value Before Hi-Pot
    test_1 = models.TextField(blank=True)  # Hi-Pot Test
    test_2 = models.TextField(blank=True)  # IR Value After Hi-Pot
    
    # Checklist Items (6 items)
    check_0 = models.TextField(blank=True)
    check_1 = models.TextField(blank=True)
    check_2 = models.TextField(blank=True)
    check_3 = models.TextField(blank=True)
    check_4 = models.TextField(blank=True)
    check_5 = models.TextField(blank=True)
    
    # Additional Fields
    remarks = models.TextField(blank=True)
    
    # Verification Table Fields
    tested_by_signature = models.TextField(blank=True)
    tested_by_name = models.CharField(max_length=100, blank=True)
    tested_by_date = models.CharField(max_length=100, blank=True)
    tested_by_company = models.CharField(max_length=100, blank=True)
    
    witness1_signature = models.TextField(blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.TextField(blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.TextField(blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    witness4_signature = models.TextField(blank=True)
    witness4_name = models.CharField(max_length=100, blank=True)
    witness4_date = models.CharField(max_length=100, blank=True)
    witness4_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_ac_cable_forms', null=True, blank=True)
    
    def __str__(self):
        return f"AC Cable Form - {self.contractor} - {self.date}"

class ACDBChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='acdb_checklist_form')
    
    # Basic Info
    client = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    date_of_inspection = models.DateField(null=True, blank=True)
    equipment_description = models.CharField(max_length=200, blank=True)
    equipment_serial_no = models.CharField(max_length=100, blank=True)
    equipment_rating = models.CharField(max_length=100, blank=True)
    ref_drawing_no = models.CharField(max_length=100, blank=True)
    
    # Page 1 Checklist (16 items)
    page1_check_0 = models.TextField(blank=True)
    page1_check_1 = models.TextField(blank=True)
    page1_check_2 = models.TextField(blank=True)
    page1_check_3 = models.TextField(blank=True)
    page1_check_4 = models.TextField(blank=True)
    page1_check_5 = models.TextField(blank=True)
    page1_check_6 = models.TextField(blank=True)
    page1_check_7 = models.TextField(blank=True)
    page1_check_8 = models.TextField(blank=True)
    page1_check_9 = models.TextField(blank=True)
    page1_check_10 = models.TextField(blank=True)
    page1_check_11 = models.TextField(blank=True)
    page1_check_12 = models.TextField(blank=True)
    page1_check_13 = models.TextField(blank=True)
    page1_check_14 = models.TextField(blank=True)
    page1_check_15 = models.TextField(blank=True)
    
    # Page 2 Checklist (12 items)
    page2_check_0 = models.TextField(blank=True)
    page2_check_1 = models.TextField(blank=True)
    page2_check_2 = models.TextField(blank=True)
    page2_check_3 = models.TextField(blank=True)
    page2_check_4 = models.TextField(blank=True)
    page2_check_5 = models.TextField(blank=True)
    page2_check_6 = models.TextField(blank=True)
    page2_check_7 = models.TextField(blank=True)
    page2_check_8 = models.TextField(blank=True)
    page2_check_9 = models.TextField(blank=True)
    page2_check_10 = models.TextField(blank=True)
    page2_check_11 = models.TextField(blank=True)
    
    # Page 3 Test Results (7 items)
    test_r_phase_earth = models.CharField(max_length=50, blank=True)
    test_y_phase_earth = models.CharField(max_length=50, blank=True)
    test_b_phase_earth = models.CharField(max_length=50, blank=True)
    test_r_y_phase = models.CharField(max_length=50, blank=True)
    test_y_b_phase = models.CharField(max_length=50, blank=True)
    test_b_r_phase = models.CharField(max_length=50, blank=True)
    test_ryb_n_bus = models.CharField(max_length=50, blank=True)
    
    # Signature fields for all pages (5 witnesses each)
    witness1_signature = models.TextField(blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.TextField(blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.TextField(blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    witness4_signature = models.TextField(blank=True)
    witness4_name = models.CharField(max_length=100, blank=True)
    witness4_date = models.CharField(max_length=100, blank=True)
    witness4_company = models.CharField(max_length=100, blank=True)
    
    witness5_signature = models.TextField(blank=True)
    witness5_name = models.CharField(max_length=100, blank=True)
    witness5_date = models.CharField(max_length=100, blank=True)
    witness5_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_acdb_forms', null=True, blank=True)
    
    def __str__(self):
        return f"ACDB Checklist - {self.client} - {self.date_of_inspection}"
class HTCableChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='ht_cable_form')
    
    # Basic Info
    project_name = models.CharField(max_length=200, blank=True)
    location_area = models.CharField(max_length=200, blank=True)
    date_of_audit = models.DateField(null=True, blank=True)
    
    # Checklist Items (15 items)
    check_0 = models.TextField(blank=True)  # IR value
    check_1 = models.TextField(blank=True)  # Physical damage
    check_2 = models.TextField(blank=True)  # Cable specs
    check_3 = models.TextField(blank=True)  # Cable route
    check_4 = models.TextField(blank=True)  # Spacing
    check_5 = models.TextField(blank=True)  # No twists
    check_6 = models.TextField(blank=True)  # Dressing
    check_7 = models.TextField(blank=True)  # Bending radius
    check_8 = models.TextField(blank=True)  # Blocks alignment
    check_9 = models.TextField(blank=True)  # Looping
    check_10 = models.TextField(blank=True)  # Hume pipes
    check_11 = models.TextField(blank=True)  # Terminations
    check_12 = models.TextField(blank=True)  # Phase sequence
    check_13 = models.TextField(blank=True)  # Earthing
    check_14 = models.TextField(blank=True)  # Cable tags
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_ht_cable_forms', null=True, blank=True)
    
    def __str__(self):
        return f"HT Cable Checklist - {self.project_name} - {self.date_of_audit}"
class HTPreCommissionForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='ht_precommission_form')
    
    # Basic Info
    client_name = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    date_of_test = models.DateField(null=True, blank=True)
    make = models.CharField(max_length=100, blank=True)
    cable_rating = models.CharField(max_length=100, blank=True)
    
    # Insulation Resistance Test - Before HV
    before_r_e = models.CharField(max_length=50, blank=True)
    before_y_e = models.CharField(max_length=50, blank=True)
    before_b_e = models.CharField(max_length=50, blank=True)
    before_r_y = models.CharField(max_length=50, blank=True)
    before_y_b = models.CharField(max_length=50, blank=True)
    before_b_r = models.CharField(max_length=50, blank=True)
    
    # Insulation Resistance Test - After HV
    after_r_e = models.CharField(max_length=50, blank=True)
    after_y_e = models.CharField(max_length=50, blank=True)
    after_b_e = models.CharField(max_length=50, blank=True)
    after_r_y = models.CharField(max_length=50, blank=True)
    after_y_b = models.CharField(max_length=50, blank=True)
    after_b_r = models.CharField(max_length=50, blank=True)
    
    # Status fields
    cables_healthy_1 = models.CharField(max_length=10, blank=True)  # Yes/No
    general_inspection = models.CharField(max_length=10, blank=True)  # Yes/No
    remarks = models.TextField(blank=True)
    
    # Hi-Pot Test
    r_ph_voltage = models.CharField(max_length=50, blank=True)
    r_ph_current = models.CharField(max_length=50, blank=True)
    r_ph_time = models.CharField(max_length=50, blank=True)
    
    y_ph_voltage = models.CharField(max_length=50, blank=True)
    y_ph_current = models.CharField(max_length=50, blank=True)
    y_ph_time = models.CharField(max_length=50, blank=True)
    
    b_ph_voltage = models.CharField(max_length=50, blank=True)
    b_ph_current = models.CharField(max_length=50, blank=True)
    b_ph_time = models.CharField(max_length=50, blank=True)
    
    # Final results
    cable_withstood_test = models.CharField(max_length=10, blank=True)  # Yes/No
    cables_healthy_2 = models.CharField(max_length=10, blank=True)  # Yes/No
    
    # Signatures
    tested_by_signature = models.TextField(blank=True)
    tested_by_name = models.CharField(max_length=100, blank=True)
    tested_by_date = models.CharField(max_length=100, blank=True)
    tested_by_company = models.CharField(max_length=100, blank=True)
    
    witness1_signature = models.TextField(blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.TextField(blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.TextField(blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    witness4_signature = models.TextField(blank=True)
    witness4_name = models.CharField(max_length=100, blank=True)
    witness4_date = models.CharField(max_length=100, blank=True)
    witness4_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_ht_precommission_forms', null=True, blank=True)
    
    def __str__(self):
        return f"HT Pre-Commission - {self.client_name} - {self.date_of_test}"
class HTPreCommissionTemplateForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='ht_precommission_template_form')
    
    # Basic Info
    client_name = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    date_of_test = models.DateField(null=True, blank=True)
    make = models.CharField(max_length=100, blank=True)
    cable_rating = models.CharField(max_length=100, blank=True)
    
    # Insulation Resistance Test - Before HV
    before_r_e = models.CharField(max_length=50, blank=True)
    before_y_e = models.CharField(max_length=50, blank=True)
    before_b_e = models.CharField(max_length=50, blank=True)
    before_r_y = models.CharField(max_length=50, blank=True)
    before_y_b = models.CharField(max_length=50, blank=True)
    before_b_r = models.CharField(max_length=50, blank=True)
    
    # Insulation Resistance Test - After HV
    after_r_e = models.CharField(max_length=50, blank=True)
    after_y_e = models.CharField(max_length=50, blank=True)
    after_b_e = models.CharField(max_length=50, blank=True)
    after_r_y = models.CharField(max_length=50, blank=True)
    after_y_b = models.CharField(max_length=50, blank=True)
    after_b_r = models.CharField(max_length=50, blank=True)
    
    # Status fields
    cables_healthy_1 = models.CharField(max_length=10, blank=True)
    general_inspection = models.CharField(max_length=10, blank=True)
    remarks = models.TextField(blank=True)
    
    # Hi-Pot Test
    r_ph_voltage = models.CharField(max_length=50, blank=True)
    r_ph_current = models.CharField(max_length=50, blank=True)
    r_ph_time = models.CharField(max_length=50, blank=True)
    
    y_ph_voltage = models.CharField(max_length=50, blank=True)
    y_ph_current = models.CharField(max_length=50, blank=True)
    y_ph_time = models.CharField(max_length=50, blank=True)
    
    b_ph_voltage = models.CharField(max_length=50, blank=True)
    b_ph_current = models.CharField(max_length=50, blank=True)
    b_ph_time = models.CharField(max_length=50, blank=True)
    
    # Final results
    cable_withstood_test = models.CharField(max_length=10, blank=True)
    cables_healthy_2 = models.CharField(max_length=10, blank=True)
    
    # Signatures
    tested_by_signature = models.TextField(blank=True)
    tested_by_name = models.CharField(max_length=100, blank=True)
    tested_by_date = models.CharField(max_length=100, blank=True)
    tested_by_company = models.CharField(max_length=100, blank=True)
    
    witness1_signature = models.TextField(blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.TextField(blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.TextField(blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    witness4_signature = models.TextField(blank=True)
    witness4_name = models.CharField(max_length=100, blank=True)
    witness4_date = models.CharField(max_length=100, blank=True)
    witness4_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_ht_precommission_template_forms', null=True, blank=True)
    
    def __str__(self):
        return f"HT Pre-Commission Template - {self.client_name} - {self.date_of_test}"
class CivilWorkChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='civil_work_checklist_form')
    
    # Basic Info
    date = models.DateField(null=True, blank=True)
    contractor_name = models.CharField(max_length=200, blank=True)
    location_no = models.CharField(max_length=100, blank=True)
    project_code = models.CharField(max_length=100, blank=True)
    customer_name = models.CharField(max_length=200, blank=True)
    
    # Checklist Items (24 items based on dataSource)
    item_0_min_qty = models.CharField(max_length=50, blank=True)  # Reinforcement
    item_0_available_qty = models.CharField(max_length=50, blank=True)
    item_0_remarks = models.TextField(blank=True)
    
    item_1_min_qty = models.CharField(max_length=50, blank=True)  # Cement
    item_1_available_qty = models.CharField(max_length=50, blank=True)
    item_1_remarks = models.TextField(blank=True)
    
    item_2_min_qty = models.CharField(max_length=50, blank=True)  # 20mm Aggregate
    item_2_available_qty = models.CharField(max_length=50, blank=True)
    item_2_remarks = models.TextField(blank=True)
    
    item_3_min_qty = models.CharField(max_length=50, blank=True)  # 10 mm Aggregate
    item_3_available_qty = models.CharField(max_length=50, blank=True)
    item_3_remarks = models.TextField(blank=True)
    
    item_4_min_qty = models.CharField(max_length=50, blank=True)  # Sand
    item_4_available_qty = models.CharField(max_length=50, blank=True)
    item_4_remarks = models.TextField(blank=True)
    
    item_5_min_qty = models.CharField(max_length=50, blank=True)  # Mixture machine
    item_5_available_qty = models.CharField(max_length=50, blank=True)
    item_5_remarks = models.TextField(blank=True)
    
    item_6_min_qty = models.CharField(max_length=50, blank=True)  # Vibrator + needle
    item_6_available_qty = models.CharField(max_length=50, blank=True)
    item_6_remarks = models.TextField(blank=True)
    
    item_7_min_qty = models.CharField(max_length=50, blank=True)  # Supervisors
    item_7_available_qty = models.CharField(max_length=50, blank=True)
    item_7_remarks = models.TextField(blank=True)
    
    item_8_min_qty = models.CharField(max_length=50, blank=True)  # Cube moulds
    item_8_available_qty = models.CharField(max_length=50, blank=True)
    item_8_remarks = models.TextField(blank=True)
    
    item_9_min_qty = models.CharField(max_length=50, blank=True)  # Mixture machine operator
    item_9_available_qty = models.CharField(max_length=50, blank=True)
    item_9_remarks = models.TextField(blank=True)
    
    item_10_min_qty = models.CharField(max_length=50, blank=True)  # Skilled masons
    item_10_available_qty = models.CharField(max_length=50, blank=True)
    item_10_remarks = models.TextField(blank=True)
    
    item_11_min_qty = models.CharField(max_length=50, blank=True)  # Labors
    item_11_available_qty = models.CharField(max_length=50, blank=True)
    item_11_remarks = models.TextField(blank=True)
    
    item_12_min_qty = models.CharField(max_length=50, blank=True)  # Slump cone
    item_12_available_qty = models.CharField(max_length=50, blank=True)
    item_12_remarks = models.TextField(blank=True)
    
    item_13_min_qty = models.CharField(max_length=50, blank=True)  # Table vibrator
    item_13_available_qty = models.CharField(max_length=50, blank=True)
    item_13_remarks = models.TextField(blank=True)
    
    item_14_min_qty = models.CharField(max_length=50, blank=True)  # Lighting arrangement
    item_14_available_qty = models.CharField(max_length=50, blank=True)
    item_14_remarks = models.TextField(blank=True)
    
    item_15_min_qty = models.CharField(max_length=50, blank=True)  # Auto level
    item_15_available_qty = models.CharField(max_length=50, blank=True)
    item_15_remarks = models.TextField(blank=True)
    
    item_16_min_qty = models.CharField(max_length=50, blank=True)  # Shuttering
    item_16_available_qty = models.CharField(max_length=50, blank=True)
    item_16_remarks = models.TextField(blank=True)
    
    item_17_min_qty = models.CharField(max_length=50, blank=True)  # Gunny bags
    item_17_available_qty = models.CharField(max_length=50, blank=True)
    item_17_remarks = models.TextField(blank=True)
    
    item_18_min_qty = models.CharField(max_length=50, blank=True)  # Welding machine
    item_18_available_qty = models.CharField(max_length=50, blank=True)
    item_18_remarks = models.TextField(blank=True)
    
    item_19_min_qty = models.CharField(max_length=50, blank=True)  # Water tank
    item_19_available_qty = models.CharField(max_length=50, blank=True)
    item_19_remarks = models.TextField(blank=True)
    
    item_20_min_qty = models.CharField(max_length=50, blank=True)  # Cube test machine
    item_20_available_qty = models.CharField(max_length=50, blank=True)
    item_20_remarks = models.TextField(blank=True)
    
    item_21_min_qty = models.CharField(max_length=50, blank=True)  # Weight machine
    item_21_available_qty = models.CharField(max_length=50, blank=True)
    item_21_remarks = models.TextField(blank=True)
    
    item_22_min_qty = models.CharField(max_length=50, blank=True)  # Measuring Tape
    item_22_available_qty = models.CharField(max_length=50, blank=True)
    item_22_remarks = models.TextField(blank=True)
    
    item_23_min_qty = models.CharField(max_length=50, blank=True)  # Bituminous paint
    item_23_available_qty = models.CharField(max_length=50, blank=True)
    item_23_remarks = models.TextField(blank=True)
    
    # General remarks
    general_remarks = models.TextField(blank=True)
    
    # Signatures
    contractor_name_sig = models.CharField(max_length=100, blank=True)
    contractor_signature = models.TextField(blank=True)
    
    prozeal_name_sig = models.CharField(max_length=100, blank=True)
    prozeal_signature = models.TextField(blank=True)
    
    client_name_sig = models.CharField(max_length=100, blank=True)
    client_signature = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_civil_work_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Civil Work Checklist - {self.contractor_name} - {self.date}"

class CementRegisterForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='cement_register_form')
    
    # Basic Info
    project_name = models.CharField(max_length=200, blank=True)
    project_location = models.CharField(max_length=200, blank=True)
    vendor_contractor_name = models.CharField(max_length=200, blank=True)
    last_updated_on = models.CharField(max_length=100, blank=True)
    last_updated_by = models.CharField(max_length=100, blank=True)
    
    # Table data (25 rows) - storing as JSON for flexibility
    table_data = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_cement_register_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Cement Register - {self.project_name} - {self.last_updated_on}"

class ConcretePourCardForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='concrete_pour_card_form')
    
    # Basic Info
    project_name = models.CharField(max_length=200, blank=True)
    project_location = models.CharField(max_length=200, blank=True)
    date = models.DateField(null=True, blank=True)
    vendor_contractor_name = models.CharField(max_length=200, blank=True)
    location_of_pour = models.CharField(max_length=200, blank=True)
    pour_no = models.CharField(max_length=100, blank=True)
    
    # Pre-Pour Checklist (13 items)
    pre_pour_0_status = models.CharField(max_length=50, blank=True)  # Approved drawing
    pre_pour_0_remarks = models.TextField(blank=True)
    
    pre_pour_1_status = models.CharField(max_length=50, blank=True)  # Marking & layout
    pre_pour_1_remarks = models.TextField(blank=True)
    
    pre_pour_2_status = models.CharField(max_length=50, blank=True)  # Piling
    pre_pour_2_remarks = models.TextField(blank=True)
    
    pre_pour_3_status = models.CharField(max_length=50, blank=True)  # Structure materials
    pre_pour_3_remarks = models.TextField(blank=True)
    
    pre_pour_4_status = models.CharField(max_length=50, blank=True)  # Structure fixing
    pre_pour_4_remarks = models.TextField(blank=True)
    
    pre_pour_5_status = models.CharField(max_length=50, blank=True)  # Structure alignment
    pre_pour_5_remarks = models.TextField(blank=True)
    
    pre_pour_6_status = models.CharField(max_length=50, blank=True)  # Slump value
    pre_pour_6_remarks = models.TextField(blank=True)
    
    pre_pour_7_status = models.CharField(max_length=50, blank=True)  # MTC availability
    pre_pour_7_remarks = models.TextField(blank=True)
    
    pre_pour_8_status = models.CharField(max_length=50, blank=True)  # Concrete mixer
    pre_pour_8_remarks = models.TextField(blank=True)
    
    pre_pour_9_status = models.CharField(max_length=50, blank=True)  # Grade of cement
    pre_pour_9_remarks = models.TextField(blank=True)
    
    pre_pour_10_status = models.CharField(max_length=50, blank=True)  # Week of cement
    pre_pour_10_remarks = models.TextField(blank=True)
    
    pre_pour_11_status = models.CharField(max_length=50, blank=True)  # Work permit
    pre_pour_11_remarks = models.TextField(blank=True)
    
    pre_pour_12_status = models.CharField(max_length=50, blank=True)  # Compaction vibrator
    pre_pour_12_remarks = models.TextField(blank=True)
    
    # Post-Pour Checklist (4 items)
    post_pour_0_status = models.CharField(max_length=50, blank=True)  # No of cubes
    post_pour_0_remarks = models.TextField(blank=True)
    
    post_pour_1_status = models.CharField(max_length=50, blank=True)  # Level of concrete
    post_pour_1_remarks = models.TextField(blank=True)
    
    post_pour_2_status = models.CharField(max_length=50, blank=True)  # Finishing
    post_pour_2_remarks = models.TextField(blank=True)
    
    post_pour_3_status = models.CharField(max_length=50, blank=True)  # Consumption Qty
    post_pour_3_remarks = models.TextField(blank=True)
    
    # Signatures
    contractor_engineer = models.CharField(max_length=100, blank=True)
    contractor_pm = models.CharField(max_length=100, blank=True)
    pgepl_qa1 = models.CharField(max_length=100, blank=True)
    pgepl_qa2 = models.CharField(max_length=100, blank=True)
    client_qa1 = models.CharField(max_length=100, blank=True)
    client_qa2 = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_concrete_pour_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Concrete Pour Card - {self.project_name} - {self.date}"

class PCCChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='pcc_checklist_form')
    
    # Basic Info
    project_name = models.CharField(max_length=200, blank=True)
    date_of_checking = models.DateField(null=True, blank=True)
    description = models.CharField(max_length=200, blank=True)
    ref_drawing_no = models.CharField(max_length=100, blank=True)
    grade_mix_proportion = models.CharField(max_length=200, blank=True)
    source_of_concrete = models.CharField(max_length=200, blank=True)
    
    # Preparation Checklist (6 items)
    prep_0_yes = models.BooleanField(default=False, blank=True)
    prep_0_no = models.BooleanField(default=False, blank=True)
    prep_0_na = models.BooleanField(default=False, blank=True)
    prep_0_remarks = models.TextField(blank=True)
    
    prep_1_yes = models.BooleanField(default=False, blank=True)
    prep_1_no = models.BooleanField(default=False, blank=True)
    prep_1_na = models.BooleanField(default=False, blank=True)
    prep_1_remarks = models.TextField(blank=True)
    
    prep_2_yes = models.BooleanField(default=False, blank=True)
    prep_2_no = models.BooleanField(default=False, blank=True)
    prep_2_na = models.BooleanField(default=False, blank=True)
    prep_2_remarks = models.TextField(blank=True)
    
    prep_3_yes = models.BooleanField(default=False, blank=True)
    prep_3_no = models.BooleanField(default=False, blank=True)
    prep_3_na = models.BooleanField(default=False, blank=True)
    prep_3_remarks = models.TextField(blank=True)
    
    prep_4_yes = models.BooleanField(default=False, blank=True)
    prep_4_no = models.BooleanField(default=False, blank=True)
    prep_4_na = models.BooleanField(default=False, blank=True)
    prep_4_remarks = models.TextField(blank=True)
    
    prep_5_yes = models.BooleanField(default=False, blank=True)
    prep_5_no = models.BooleanField(default=False, blank=True)
    prep_5_na = models.BooleanField(default=False, blank=True)
    prep_5_remarks = models.TextField(blank=True)
    
    # In-process Checklist (3 items)
    inprocess_0_yes = models.BooleanField(default=False, blank=True)
    inprocess_0_no = models.BooleanField(default=False, blank=True)
    inprocess_0_na = models.BooleanField(default=False, blank=True)
    inprocess_0_remarks = models.TextField(blank=True)
    
    inprocess_1_yes = models.BooleanField(default=False, blank=True)
    inprocess_1_no = models.BooleanField(default=False, blank=True)
    inprocess_1_na = models.BooleanField(default=False, blank=True)
    inprocess_1_remarks = models.TextField(blank=True)
    
    inprocess_2_yes = models.BooleanField(default=False, blank=True)
    inprocess_2_no = models.BooleanField(default=False, blank=True)
    inprocess_2_na = models.BooleanField(default=False, blank=True)
    inprocess_2_remarks = models.TextField(blank=True)
    
    # Comments
    comments = models.TextField(blank=True)
    
    # Signatures
    checked_by_signature = models.CharField(max_length=100, blank=True)
    checked_by_name = models.CharField(max_length=100, blank=True)
    checked_by_date = models.CharField(max_length=100, blank=True)
    checked_by_company = models.CharField(max_length=100, blank=True)
    
    witness1_signature = models.CharField(max_length=100, blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.CharField(max_length=100, blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.CharField(max_length=100, blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_pcc_checklist_forms', null=True, blank=True)
    
    def __str__(self):
        return f"PCC Checklist - {self.project_name} - {self.date_of_checking}"

class BarBendingScheduleForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='bar_bending_schedule_form')
    
    # Basic Info
    contractor = models.CharField(max_length=200, blank=True)
    project = models.CharField(max_length=200, blank=True)
    client = models.CharField(max_length=200, blank=True)
    sub_contractor = models.CharField(max_length=200, blank=True)
    name_of_structure = models.CharField(max_length=200, blank=True)
    name_of_drawing = models.CharField(max_length=200, blank=True)
    drawing_no = models.CharField(max_length=100, blank=True)
    rev_no_date = models.CharField(max_length=100, blank=True)
    
    # Table data (10 rows) - storing as JSON for flexibility
    table_data = models.JSONField(default=list, blank=True)
    
    # Summary fields
    unit_weight = models.TextField(blank=True)
    total_length = models.CharField(max_length=200, blank=True)
    total_weight = models.CharField(max_length=200, blank=True)
    gross_weight = models.CharField(max_length=100, blank=True)
    
    # Signatures
    prepared_by = models.CharField(max_length=200, blank=True)
    checked_by = models.CharField(max_length=200, blank=True)
    approved_by = models.CharField(max_length=200, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_bar_bending_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Bar Bending Schedule - {self.project} - {self.name_of_structure}"

class BatteryChargerChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='battery_charger_checklist_form')
    
    # Basic Info
    drawing_specification_no = models.CharField(max_length=200, blank=True)
    site_location_area = models.CharField(max_length=200, blank=True)
    
    # Checklist Items (18 items)
    check_0_yes = models.BooleanField(default=False, blank=True)
    check_0_no = models.BooleanField(default=False, blank=True)
    check_0_na = models.BooleanField(default=False, blank=True)
    check_0_remarks = models.TextField(blank=True)
    
    check_1_yes = models.BooleanField(default=False, blank=True)
    check_1_no = models.BooleanField(default=False, blank=True)
    check_1_na = models.BooleanField(default=False, blank=True)
    check_1_remarks = models.TextField(blank=True)
    
    check_2_yes = models.BooleanField(default=False, blank=True)
    check_2_no = models.BooleanField(default=False, blank=True)
    check_2_na = models.BooleanField(default=False, blank=True)
    check_2_remarks = models.TextField(blank=True)
    
    check_3_yes = models.BooleanField(default=False, blank=True)
    check_3_no = models.BooleanField(default=False, blank=True)
    check_3_na = models.BooleanField(default=False, blank=True)
    check_3_remarks = models.TextField(blank=True)
    
    check_4_yes = models.BooleanField(default=False, blank=True)
    check_4_no = models.BooleanField(default=False, blank=True)
    check_4_na = models.BooleanField(default=False, blank=True)
    check_4_remarks = models.TextField(blank=True)
    
    check_5_yes = models.BooleanField(default=False, blank=True)
    check_5_no = models.BooleanField(default=False, blank=True)
    check_5_na = models.BooleanField(default=False, blank=True)
    check_5_remarks = models.TextField(blank=True)
    
    check_6_yes = models.BooleanField(default=False, blank=True)
    check_6_no = models.BooleanField(default=False, blank=True)
    check_6_na = models.BooleanField(default=False, blank=True)
    check_6_remarks = models.TextField(blank=True)
    
    check_7_yes = models.BooleanField(default=False, blank=True)
    check_7_no = models.BooleanField(default=False, blank=True)
    check_7_na = models.BooleanField(default=False, blank=True)
    check_7_remarks = models.TextField(blank=True)
    
    check_8_yes = models.BooleanField(default=False, blank=True)
    check_8_no = models.BooleanField(default=False, blank=True)
    check_8_na = models.BooleanField(default=False, blank=True)
    check_8_remarks = models.TextField(blank=True)
    
    check_9_yes = models.BooleanField(default=False, blank=True)
    check_9_no = models.BooleanField(default=False, blank=True)
    check_9_na = models.BooleanField(default=False, blank=True)
    check_9_remarks = models.TextField(blank=True)
    
    check_10_yes = models.BooleanField(default=False, blank=True)
    check_10_no = models.BooleanField(default=False, blank=True)
    check_10_na = models.BooleanField(default=False, blank=True)
    check_10_remarks = models.TextField(blank=True)
    
    check_11_yes = models.BooleanField(default=False, blank=True)
    check_11_no = models.BooleanField(default=False, blank=True)
    check_11_na = models.BooleanField(default=False, blank=True)
    check_11_remarks = models.TextField(blank=True)
    
    check_12_yes = models.BooleanField(default=False, blank=True)
    check_12_no = models.BooleanField(default=False, blank=True)
    check_12_na = models.BooleanField(default=False, blank=True)
    check_12_remarks = models.TextField(blank=True)
    
    check_13_yes = models.BooleanField(default=False, blank=True)
    check_13_no = models.BooleanField(default=False, blank=True)
    check_13_na = models.BooleanField(default=False, blank=True)
    check_13_remarks = models.TextField(blank=True)
    
    check_14_yes = models.BooleanField(default=False, blank=True)
    check_14_no = models.BooleanField(default=False, blank=True)
    check_14_na = models.BooleanField(default=False, blank=True)
    check_14_remarks = models.TextField(blank=True)
    
    check_15_yes = models.BooleanField(default=False, blank=True)
    check_15_no = models.BooleanField(default=False, blank=True)
    check_15_na = models.BooleanField(default=False, blank=True)
    check_15_remarks = models.TextField(blank=True)
    
    check_16_yes = models.BooleanField(default=False, blank=True)
    check_16_no = models.BooleanField(default=False, blank=True)
    check_16_na = models.BooleanField(default=False, blank=True)
    check_16_remarks = models.TextField(blank=True)
    
    check_17_yes = models.BooleanField(default=False, blank=True)
    check_17_no = models.BooleanField(default=False, blank=True)
    check_17_na = models.BooleanField(default=False, blank=True)
    check_17_remarks = models.TextField(blank=True)
    
    # Comments
    comments = models.TextField(blank=True)
    
    # Signatures
    checked_by_signature = models.CharField(max_length=100, blank=True)
    checked_by_name = models.CharField(max_length=100, blank=True)
    checked_by_date = models.CharField(max_length=100, blank=True)
    checked_by_company = models.CharField(max_length=100, blank=True)
    
    witness1_signature = models.CharField(max_length=100, blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.CharField(max_length=100, blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.CharField(max_length=100, blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    witness4_signature = models.CharField(max_length=100, blank=True)
    witness4_name = models.CharField(max_length=100, blank=True)
    witness4_date = models.CharField(max_length=100, blank=True)
    witness4_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_battery_charger_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Battery Charger Checklist - {self.site_location_area}"

class BatteryUPSChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='battery_ups_checklist_form')
    
    # Basic Info
    client = models.CharField(max_length=200, blank=True)
    date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    battery_details = models.CharField(max_length=200, blank=True)
    battery_rating = models.CharField(max_length=100, blank=True)
    charging_discharging_room_amp = models.CharField(max_length=100, blank=True)
    
    # General Checklist (16 items)
    check_0_status = models.CharField(max_length=50, blank=True)
    check_1_status = models.CharField(max_length=50, blank=True)
    check_2_status = models.CharField(max_length=50, blank=True)
    check_3_status = models.CharField(max_length=50, blank=True)
    check_4_status = models.CharField(max_length=50, blank=True)
    check_5_status = models.CharField(max_length=50, blank=True)
    check_6_status = models.CharField(max_length=50, blank=True)
    check_7_status = models.CharField(max_length=50, blank=True)
    check_8_status = models.CharField(max_length=50, blank=True)
    check_9_status = models.CharField(max_length=50, blank=True)
    check_10_status = models.CharField(max_length=50, blank=True)
    check_11_status = models.CharField(max_length=50, blank=True)
    check_12_status = models.CharField(max_length=50, blank=True)
    check_13_status = models.CharField(max_length=50, blank=True)
    check_14_status = models.CharField(max_length=50, blank=True)
    check_15_status = models.CharField(max_length=50, blank=True)
    
    # Charging/Discharging Amount
    charging_discharging_amount = models.CharField(max_length=100, blank=True)
    
    # First Signature Table
    tested_by_signature = models.CharField(max_length=100, blank=True)
    tested_by_name = models.CharField(max_length=100, blank=True)
    tested_by_date = models.CharField(max_length=100, blank=True)
    tested_by_company = models.CharField(max_length=100, blank=True)
    
    witness1_signature = models.CharField(max_length=100, blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.CharField(max_length=100, blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.CharField(max_length=100, blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    # Battery Cell Test Results (6 cells)
    cell_test_data = models.JSONField(default=list, blank=True)
    
    # Second Signature Table
    signed_by_signature = models.CharField(max_length=100, blank=True)
    signed_by_name = models.CharField(max_length=100, blank=True)
    signed_by_date = models.CharField(max_length=100, blank=True)
    signed_by_company = models.CharField(max_length=100, blank=True)
    
    witness4_signature = models.CharField(max_length=100, blank=True)
    witness4_name = models.CharField(max_length=100, blank=True)
    witness4_date = models.CharField(max_length=100, blank=True)
    witness4_company = models.CharField(max_length=100, blank=True)
    
    witness5_signature = models.CharField(max_length=100, blank=True)
    witness5_name = models.CharField(max_length=100, blank=True)
    witness5_date = models.CharField(max_length=100, blank=True)
    witness5_company = models.CharField(max_length=100, blank=True)
    
    witness6_signature = models.CharField(max_length=100, blank=True)
    witness6_name = models.CharField(max_length=100, blank=True)
    witness6_date = models.CharField(max_length=100, blank=True)
    witness6_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_battery_ups_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Battery UPS Checklist - {self.client} - {self.date}"

class BusDuctChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='bus_duct_checklist_form')
    
    # Basic Info
    client = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    date_of_testing = models.DateField(null=True, blank=True)
    equipment_rating = models.CharField(max_length=100, blank=True)
    ref_drawing_no = models.CharField(max_length=100, blank=True)
    
    # Main Checklist (12 items)
    check_0_remarks = models.TextField(blank=True)
    check_1_remarks = models.TextField(blank=True)
    check_2_remarks = models.TextField(blank=True)
    check_3_remarks = models.TextField(blank=True)
    check_4_remarks = models.TextField(blank=True)
    check_5_remarks = models.TextField(blank=True)
    check_6_remarks = models.TextField(blank=True)
    check_7_remarks = models.TextField(blank=True)
    check_8_remarks = models.TextField(blank=True)
    check_9_remarks = models.TextField(blank=True)
    check_10_remarks = models.TextField(blank=True)
    check_11_remarks = models.TextField(blank=True)
    
    # General Checks (7 items)
    general_0_input = models.TextField(blank=True)
    general_1_input = models.TextField(blank=True)
    general_2_input = models.TextField(blank=True)
    general_3_input = models.TextField(blank=True)
    general_4_input = models.TextField(blank=True)
    general_5_input = models.TextField(blank=True)
    general_6_input = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_bus_duct_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Bus Duct Checklist - {self.client} - {self.date_of_testing}"

class ControlCableChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='control_cable_checklist_form')
    
    # Basic Info
    drawing_specification_no = models.CharField(max_length=200, blank=True)
    site_location_area = models.CharField(max_length=200, blank=True)
    
    # Checklist Items (11 items)
    check_0_yes = models.BooleanField(default=False, blank=True)
    check_0_no = models.BooleanField(default=False, blank=True)
    check_0_na = models.BooleanField(default=False, blank=True)
    check_0_remarks = models.TextField(blank=True)
    
    check_1_yes = models.BooleanField(default=False, blank=True)
    check_1_no = models.BooleanField(default=False, blank=True)
    check_1_na = models.BooleanField(default=False, blank=True)
    check_1_remarks = models.TextField(blank=True)
    
    check_2_yes = models.BooleanField(default=False, blank=True)
    check_2_no = models.BooleanField(default=False, blank=True)
    check_2_na = models.BooleanField(default=False, blank=True)
    check_2_remarks = models.TextField(blank=True)
    
    check_3_yes = models.BooleanField(default=False, blank=True)
    check_3_no = models.BooleanField(default=False, blank=True)
    check_3_na = models.BooleanField(default=False, blank=True)
    check_3_remarks = models.TextField(blank=True)
    
    check_4_yes = models.BooleanField(default=False, blank=True)
    check_4_no = models.BooleanField(default=False, blank=True)
    check_4_na = models.BooleanField(default=False, blank=True)
    check_4_remarks = models.TextField(blank=True)
    
    check_5_yes = models.BooleanField(default=False, blank=True)
    check_5_no = models.BooleanField(default=False, blank=True)
    check_5_na = models.BooleanField(default=False, blank=True)
    check_5_remarks = models.TextField(blank=True)
    
    check_6_yes = models.BooleanField(default=False, blank=True)
    check_6_no = models.BooleanField(default=False, blank=True)
    check_6_na = models.BooleanField(default=False, blank=True)
    check_6_remarks = models.TextField(blank=True)
    
    check_7_yes = models.BooleanField(default=False, blank=True)
    check_7_no = models.BooleanField(default=False, blank=True)
    check_7_na = models.BooleanField(default=False, blank=True)
    check_7_remarks = models.TextField(blank=True)
    
    check_8_yes = models.BooleanField(default=False, blank=True)
    check_8_no = models.BooleanField(default=False, blank=True)
    check_8_na = models.BooleanField(default=False, blank=True)
    check_8_remarks = models.TextField(blank=True)
    
    check_9_yes = models.BooleanField(default=False, blank=True)
    check_9_no = models.BooleanField(default=False, blank=True)
    check_9_na = models.BooleanField(default=False, blank=True)
    check_9_remarks = models.TextField(blank=True)
    
    check_10_yes = models.BooleanField(default=False, blank=True)
    check_10_no = models.BooleanField(default=False, blank=True)
    check_10_na = models.BooleanField(default=False, blank=True)
    check_10_remarks = models.TextField(blank=True)
    
    # Comments
    comments = models.TextField(blank=True)
    
    # Signatures
    checked_by_signature = models.CharField(max_length=100, blank=True)
    checked_by_name = models.CharField(max_length=100, blank=True)
    checked_by_date = models.CharField(max_length=100, blank=True)
    checked_by_company = models.CharField(max_length=100, blank=True)
    
    witness1_signature = models.CharField(max_length=100, blank=True)
    witness1_name = models.CharField(max_length=100, blank=True)
    witness1_date = models.CharField(max_length=100, blank=True)
    witness1_company = models.CharField(max_length=100, blank=True)
    
    witness2_signature = models.CharField(max_length=100, blank=True)
    witness2_name = models.CharField(max_length=100, blank=True)
    witness2_date = models.CharField(max_length=100, blank=True)
    witness2_company = models.CharField(max_length=100, blank=True)
    
    witness3_signature = models.CharField(max_length=100, blank=True)
    witness3_name = models.CharField(max_length=100, blank=True)
    witness3_date = models.CharField(max_length=100, blank=True)
    witness3_company = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_control_cable_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Control Cable Checklist - {self.site_location_area}"

class ControlRoomAuditChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='control_room_audit_checklist_form')
    
    # Control & Relay Panel (9 items)
    control_relay_0_yes = models.BooleanField(default=False, blank=True)
    control_relay_0_no = models.BooleanField(default=False, blank=True)
    control_relay_0_remarks = models.TextField(blank=True)
    
    control_relay_1_yes = models.BooleanField(default=False, blank=True)
    control_relay_1_no = models.BooleanField(default=False, blank=True)
    control_relay_1_remarks = models.TextField(blank=True)
    
    control_relay_2_yes = models.BooleanField(default=False, blank=True)
    control_relay_2_no = models.BooleanField(default=False, blank=True)
    control_relay_2_remarks = models.TextField(blank=True)
    
    control_relay_3_yes = models.BooleanField(default=False, blank=True)
    control_relay_3_no = models.BooleanField(default=False, blank=True)
    control_relay_3_remarks = models.TextField(blank=True)
    
    control_relay_4_yes = models.BooleanField(default=False, blank=True)
    control_relay_4_no = models.BooleanField(default=False, blank=True)
    control_relay_4_remarks = models.TextField(blank=True)
    
    control_relay_5_yes = models.BooleanField(default=False, blank=True)
    control_relay_5_no = models.BooleanField(default=False, blank=True)
    control_relay_5_remarks = models.TextField(blank=True)
    
    control_relay_6_yes = models.BooleanField(default=False, blank=True)
    control_relay_6_no = models.BooleanField(default=False, blank=True)
    control_relay_6_remarks = models.TextField(blank=True)
    
    control_relay_7_yes = models.BooleanField(default=False, blank=True)
    control_relay_7_no = models.BooleanField(default=False, blank=True)
    control_relay_7_remarks = models.TextField(blank=True)
    
    control_relay_8_yes = models.BooleanField(default=False, blank=True)
    control_relay_8_no = models.BooleanField(default=False, blank=True)
    control_relay_8_remarks = models.TextField(blank=True)
    
    # Switchgear Panel (9 items)
    switchgear_0_yes = models.BooleanField(default=False, blank=True)
    switchgear_0_no = models.BooleanField(default=False, blank=True)
    switchgear_0_remarks = models.TextField(blank=True)
    
    switchgear_1_yes = models.BooleanField(default=False, blank=True)
    switchgear_1_no = models.BooleanField(default=False, blank=True)
    switchgear_1_remarks = models.TextField(blank=True)
    
    switchgear_2_yes = models.BooleanField(default=False, blank=True)
    switchgear_2_no = models.BooleanField(default=False, blank=True)
    switchgear_2_remarks = models.TextField(blank=True)
    
    switchgear_3_yes = models.BooleanField(default=False, blank=True)
    switchgear_3_no = models.BooleanField(default=False, blank=True)
    switchgear_3_remarks = models.TextField(blank=True)
    
    switchgear_4_yes = models.BooleanField(default=False, blank=True)
    switchgear_4_no = models.BooleanField(default=False, blank=True)
    switchgear_4_remarks = models.TextField(blank=True)
    
    switchgear_5_yes = models.BooleanField(default=False, blank=True)
    switchgear_5_no = models.BooleanField(default=False, blank=True)
    switchgear_5_remarks = models.TextField(blank=True)
    
    switchgear_6_yes = models.BooleanField(default=False, blank=True)
    switchgear_6_no = models.BooleanField(default=False, blank=True)
    switchgear_6_remarks = models.TextField(blank=True)
    
    switchgear_7_yes = models.BooleanField(default=False, blank=True)
    switchgear_7_no = models.BooleanField(default=False, blank=True)
    switchgear_7_remarks = models.TextField(blank=True)
    
    switchgear_8_yes = models.BooleanField(default=False, blank=True)
    switchgear_8_no = models.BooleanField(default=False, blank=True)
    switchgear_8_remarks = models.TextField(blank=True)
    
    # Bus-Bar Portion (3 items)
    busbar_0_yes = models.BooleanField(default=False, blank=True)
    busbar_0_no = models.BooleanField(default=False, blank=True)
    busbar_0_remarks = models.TextField(blank=True)
    
    busbar_1_yes = models.BooleanField(default=False, blank=True)
    busbar_1_no = models.BooleanField(default=False, blank=True)
    busbar_1_remarks = models.TextField(blank=True)
    
    busbar_2_yes = models.BooleanField(default=False, blank=True)
    busbar_2_no = models.BooleanField(default=False, blank=True)
    busbar_2_remarks = models.TextField(blank=True)
    
    # Outgoing & Incoming Cable (2 items)
    cables_0_yes = models.BooleanField(default=False, blank=True)
    cables_0_no = models.BooleanField(default=False, blank=True)
    cables_0_remarks = models.TextField(blank=True)
    
    cables_1_yes = models.BooleanField(default=False, blank=True)
    cables_1_no = models.BooleanField(default=False, blank=True)
    cables_1_remarks = models.TextField(blank=True)
    
    # Control Circuit Portion (4 items)
    control_circuit_0_yes = models.BooleanField(default=False, blank=True)
    control_circuit_0_no = models.BooleanField(default=False, blank=True)
    control_circuit_0_remarks = models.TextField(blank=True)
    
    control_circuit_1_yes = models.BooleanField(default=False, blank=True)
    control_circuit_1_no = models.BooleanField(default=False, blank=True)
    control_circuit_1_remarks = models.TextField(blank=True)
    
    control_circuit_2_yes = models.BooleanField(default=False, blank=True)
    control_circuit_2_no = models.BooleanField(default=False, blank=True)
    control_circuit_2_remarks = models.TextField(blank=True)
    
    control_circuit_3_yes = models.BooleanField(default=False, blank=True)
    control_circuit_3_no = models.BooleanField(default=False, blank=True)
    control_circuit_3_remarks = models.TextField(blank=True)
    
    # Current Transformer (4 items)
    ct_portion_0_yes = models.BooleanField(default=False, blank=True)
    ct_portion_0_no = models.BooleanField(default=False, blank=True)
    ct_portion_0_remarks = models.TextField(blank=True)
    
    ct_portion_1_yes = models.BooleanField(default=False, blank=True)
    ct_portion_1_no = models.BooleanField(default=False, blank=True)
    ct_portion_1_remarks = models.TextField(blank=True)
    
    ct_portion_2_yes = models.BooleanField(default=False, blank=True)
    ct_portion_2_no = models.BooleanField(default=False, blank=True)
    ct_portion_2_remarks = models.TextField(blank=True)
    
    ct_portion_3_yes = models.BooleanField(default=False, blank=True)
    ct_portion_3_no = models.BooleanField(default=False, blank=True)
    ct_portion_3_remarks = models.TextField(blank=True)
    
    # Voltage Transformer (4 items)
    pt_portion_0_yes = models.BooleanField(default=False, blank=True)
    pt_portion_0_no = models.BooleanField(default=False, blank=True)
    pt_portion_0_remarks = models.TextField(blank=True)
    
    pt_portion_1_yes = models.BooleanField(default=False, blank=True)
    pt_portion_1_no = models.BooleanField(default=False, blank=True)
    pt_portion_1_remarks = models.TextField(blank=True)
    
    pt_portion_2_yes = models.BooleanField(default=False, blank=True)
    pt_portion_2_no = models.BooleanField(default=False, blank=True)
    pt_portion_2_remarks = models.TextField(blank=True)
    
    pt_portion_3_yes = models.BooleanField(default=False, blank=True)
    pt_portion_3_no = models.BooleanField(default=False, blank=True)
    pt_portion_3_remarks = models.TextField(blank=True)
    
    # Battery Charger (7 items)
    battery_charger_0_yes = models.BooleanField(default=False, blank=True)
    battery_charger_0_no = models.BooleanField(default=False, blank=True)
    battery_charger_0_remarks = models.TextField(blank=True)
    
    battery_charger_1_yes = models.BooleanField(default=False, blank=True)
    battery_charger_1_no = models.BooleanField(default=False, blank=True)
    battery_charger_1_remarks = models.TextField(blank=True)
    
    battery_charger_2_yes = models.BooleanField(default=False, blank=True)
    battery_charger_2_no = models.BooleanField(default=False, blank=True)
    battery_charger_2_remarks = models.TextField(blank=True)
    
    battery_charger_3_yes = models.BooleanField(default=False, blank=True)
    battery_charger_3_no = models.BooleanField(default=False, blank=True)
    battery_charger_3_remarks = models.TextField(blank=True)
    
    battery_charger_4_yes = models.BooleanField(default=False, blank=True)
    battery_charger_4_no = models.BooleanField(default=False, blank=True)
    battery_charger_4_remarks = models.TextField(blank=True)
    
    battery_charger_5_yes = models.BooleanField(default=False, blank=True)
    battery_charger_5_no = models.BooleanField(default=False, blank=True)
    battery_charger_5_remarks = models.TextField(blank=True)
    
    battery_charger_6_yes = models.BooleanField(default=False, blank=True)
    battery_charger_6_no = models.BooleanField(default=False, blank=True)
    battery_charger_6_remarks = models.TextField(blank=True)
    
    # Battery Bank (5 items)
    battery_bank_0_yes = models.BooleanField(default=False, blank=True)
    battery_bank_0_no = models.BooleanField(default=False, blank=True)
    battery_bank_0_remarks = models.TextField(blank=True)
    
    battery_bank_1_yes = models.BooleanField(default=False, blank=True)
    battery_bank_1_no = models.BooleanField(default=False, blank=True)
    battery_bank_1_remarks = models.TextField(blank=True)
    
    battery_bank_2_yes = models.BooleanField(default=False, blank=True)
    battery_bank_2_no = models.BooleanField(default=False, blank=True)
    battery_bank_2_remarks = models.TextField(blank=True)
    
    battery_bank_3_yes = models.BooleanField(default=False, blank=True)
    battery_bank_3_no = models.BooleanField(default=False, blank=True)
    battery_bank_3_remarks = models.TextField(blank=True)
    
    battery_bank_4_yes = models.BooleanField(default=False, blank=True)
    battery_bank_4_no = models.BooleanField(default=False, blank=True)
    battery_bank_4_remarks = models.TextField(blank=True)
    
    # SCADA Room (3 items)
    scada_0_yes = models.BooleanField(default=False, blank=True)
    scada_0_no = models.BooleanField(default=False, blank=True)
    scada_0_remarks = models.TextField(blank=True)
    
    scada_1_yes = models.BooleanField(default=False, blank=True)
    scada_1_no = models.BooleanField(default=False, blank=True)
    scada_1_remarks = models.TextField(blank=True)
    
    scada_2_yes = models.BooleanField(default=False, blank=True)
    scada_2_no = models.BooleanField(default=False, blank=True)
    scada_2_remarks = models.TextField(blank=True)
    
    # Fire Fighting Equipments (6 items)
    fire_fighting_0_yes = models.BooleanField(default=False, blank=True)
    fire_fighting_0_no = models.BooleanField(default=False, blank=True)
    fire_fighting_0_remarks = models.TextField(blank=True)
    
    fire_fighting_1_yes = models.BooleanField(default=False, blank=True)
    fire_fighting_1_no = models.BooleanField(default=False, blank=True)
    fire_fighting_1_remarks = models.TextField(blank=True)
    
    fire_fighting_2_yes = models.BooleanField(default=False, blank=True)
    fire_fighting_2_no = models.BooleanField(default=False, blank=True)
    fire_fighting_2_remarks = models.TextField(blank=True)
    
    fire_fighting_3_yes = models.BooleanField(default=False, blank=True)
    fire_fighting_3_no = models.BooleanField(default=False, blank=True)
    fire_fighting_3_remarks = models.TextField(blank=True)
    
    fire_fighting_4_yes = models.BooleanField(default=False, blank=True)
    fire_fighting_4_no = models.BooleanField(default=False, blank=True)
    fire_fighting_4_remarks = models.TextField(blank=True)
    
    fire_fighting_5_yes = models.BooleanField(default=False, blank=True)
    fire_fighting_5_no = models.BooleanField(default=False, blank=True)
    fire_fighting_5_remarks = models.TextField(blank=True)
    
    # Safety Appliances (1 item)
    safety_0_yes = models.BooleanField(default=False, blank=True)
    safety_0_no = models.BooleanField(default=False, blank=True)
    safety_0_remarks = models.TextField(blank=True)
    
    # Key Board (1 item)
    key_board_0_yes = models.BooleanField(default=False, blank=True)
    key_board_0_no = models.BooleanField(default=False, blank=True)
    key_board_0_remarks = models.TextField(blank=True)
    
    # Control of Lighting & Fans (2 items)
    lighting_fans_0_yes = models.BooleanField(default=False, blank=True)
    lighting_fans_0_no = models.BooleanField(default=False, blank=True)
    lighting_fans_0_remarks = models.TextField(blank=True)
    
    lighting_fans_1_yes = models.BooleanField(default=False, blank=True)
    lighting_fans_1_no = models.BooleanField(default=False, blank=True)
    lighting_fans_1_remarks = models.TextField(blank=True)
    
    # Single Line Diagram Board (1 item)
    sld_board_0_yes = models.BooleanField(default=False, blank=True)
    sld_board_0_no = models.BooleanField(default=False, blank=True)
    sld_board_0_remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_control_room_audit_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Control Room Audit Checklist - {self.created_at.date()}"

class EarthingChecklistForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='earthing_checklist_form')
    
    # Basic Info
    project = models.CharField(max_length=200, blank=True)
    date = models.DateField(null=True, blank=True)
    block_no = models.CharField(max_length=100, blank=True)
    serial_no = models.CharField(max_length=100, blank=True)
    equipment_make = models.CharField(max_length=100, blank=True)
    calibration_date = models.DateField(null=True, blank=True)
    rfi_no = models.CharField(max_length=100, blank=True)
    ref_drg_no = models.CharField(max_length=100, blank=True)
    
    # Checklist Items (8 items)
    check_0_yes = models.BooleanField(default=False, blank=True)
    check_0_no = models.BooleanField(default=False, blank=True)
    check_0_na = models.BooleanField(default=False, blank=True)
    check_0_remarks = models.TextField(blank=True)
    
    check_1_yes = models.BooleanField(default=False, blank=True)
    check_1_no = models.BooleanField(default=False, blank=True)
    check_1_na = models.BooleanField(default=False, blank=True)
    check_1_remarks = models.TextField(blank=True)
    
    check_2_yes = models.BooleanField(default=False, blank=True)
    check_2_no = models.BooleanField(default=False, blank=True)
    check_2_na = models.BooleanField(default=False, blank=True)
    check_2_remarks = models.TextField(blank=True)
    
    check_3_yes = models.BooleanField(default=False, blank=True)
    check_3_no = models.BooleanField(default=False, blank=True)
    check_3_na = models.BooleanField(default=False, blank=True)
    check_3_remarks = models.TextField(blank=True)
    
    check_4_yes = models.BooleanField(default=False, blank=True)
    check_4_no = models.BooleanField(default=False, blank=True)
    check_4_na = models.BooleanField(default=False, blank=True)
    check_4_remarks = models.TextField(blank=True)
    
    check_5_yes = models.BooleanField(default=False, blank=True)
    check_5_no = models.BooleanField(default=False, blank=True)
    check_5_na = models.BooleanField(default=False, blank=True)
    check_5_remarks = models.TextField(blank=True)
    
    check_6_yes = models.BooleanField(default=False, blank=True)
    check_6_no = models.BooleanField(default=False, blank=True)
    check_6_na = models.BooleanField(default=False, blank=True)
    check_6_remarks = models.TextField(blank=True)
    
    check_7_yes = models.BooleanField(default=False, blank=True)
    check_7_no = models.BooleanField(default=False, blank=True)
    check_7_na = models.BooleanField(default=False, blank=True)
    check_7_remarks = models.TextField(blank=True)
    
    # Signatures
    contractor_signature = models.CharField(max_length=100, blank=True)
    contractor_name = models.CharField(max_length=100, blank=True)
    contractor_date = models.CharField(max_length=100, blank=True)
    
    execution_signature = models.CharField(max_length=100, blank=True)
    execution_name = models.CharField(max_length=100, blank=True)
    execution_date = models.CharField(max_length=100, blank=True)
    
    qa_signature = models.CharField(max_length=100, blank=True)
    qa_name = models.CharField(max_length=100, blank=True)
    qa_date = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_earthing_forms', null=True, blank=True)
    
    def __str__(self):
        return f"Earthing Checklist - {self.project} - {self.date}"