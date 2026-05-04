# Data migration: Extract JSON contractor_company_ids into relational structure

from django.db import migrations


def migrate_contractor_data(apps, schema_editor):
    """
    Extract contractor_company_ids and epc_company_ids from Project JSON fields
    and create ContractorMaster records (treating EPC as contractors for compliance)
    """
    Project = apps.get_model('projects', 'Project')
    ContractorMaster = apps.get_model('workforce', 'ContractorMaster')
    
    contractor_map = {}  # Track created contractors to avoid duplicates
    
    for project in Project.objects.all():
        tenant_id = project.athens_tenant_id or 0
        
        # Process contractor_company_ids
        if project.contractor_company_ids:
            for contractor_data in project.contractor_company_ids:
                if not isinstance(contractor_data, dict):
                    continue
                
                company_name = contractor_data.get('name', contractor_data.get('company_name', ''))
                if not company_name:
                    continue
                
                key = f"{tenant_id}_contractor_{company_name}"
                
                if key not in contractor_map:
                    contractor = ContractorMaster.objects.create(
                        athens_tenant_id=tenant_id,
                        company_type='contractor',
                        company_name=company_name,
                        company_address=contractor_data.get('address', contractor_data.get('registered_address', '')),
                        contact_person=contractor_data.get('contact_person', ''),
                        contact_number=contractor_data.get('contact_number', contractor_data.get('phone', '')),
                        email=contractor_data.get('email', f'contractor_{tenant_id}@placeholder.com'),
                        pan_number=contractor_data.get('pan_number', ''),
                        gst_number=contractor_data.get('gst_number', ''),
                        status='active'
                    )
                    contractor_map[key] = contractor.id
                    print(f"✓ Created contractor: {company_name} (Tenant: {tenant_id})")
        
        # Process epc_company_ids (treat as contractors for compliance)
        if project.epc_company_ids:
            for epc_data in project.epc_company_ids:
                if not isinstance(epc_data, dict):
                    continue
                
                company_name = epc_data.get('name', epc_data.get('company_name', ''))
                if not company_name:
                    continue
                
                key = f"{tenant_id}_epc_{company_name}"
                
                if key not in contractor_map:
                    contractor = ContractorMaster.objects.create(
                        athens_tenant_id=tenant_id,
                        company_type='epc',
                        company_name=company_name,
                        company_address=epc_data.get('address', epc_data.get('registered_address', '')),
                        contact_person=epc_data.get('contact_person', ''),
                        contact_number=epc_data.get('contact_number', epc_data.get('phone', '')),
                        email=epc_data.get('email', f'epc_{tenant_id}@placeholder.com'),
                        pan_number=epc_data.get('pan_number', ''),
                        gst_number=epc_data.get('gst_number', ''),
                        status='active'
                    )
                    contractor_map[key] = contractor.id
                    print(f"✓ Created EPC as contractor: {company_name} (Tenant: {tenant_id})")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - restore JSON data if needed
    Note: This is a lossy operation if compliance data was added
    """
    pass  # JSON data still exists in Project model until migration 0004


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0003_contractor_compliance'),
    ]

    operations = [
        migrations.RunPython(migrate_contractor_data, reverse_migration),
    ]
