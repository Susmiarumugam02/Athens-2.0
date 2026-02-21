# Generated migration for component-based architecture

from django.db import migrations

def migrate_to_components(apps, schema_editor):
    ProjectModule = apps.get_model('control_plane', 'ProjectModule')
    
    # Mapping old codes to new component codes
    COMPONENT_MAPPING = {
        'ergon': ['ergon_tasks', 'ergon_planner', 'ergon_followups', 'ergon_advance', 'ergon_manpower', 'ergon_ledger'],
        'workforce': ['workforce_profile', 'workforce_attendance', 'workforce_leave'],
    }
    
    # Get all old entries
    old_entries = ProjectModule.objects.filter(module_code__in=['ergon', 'workforce'])
    
    for entry in old_entries:
        if entry.module_code in COMPONENT_MAPPING:
            components = COMPONENT_MAPPING[entry.module_code]
            
            # Create component entries
            for component_code in components:
                ProjectModule.objects.get_or_create(
                    project_id=entry.project_id,
                    athens_tenant_id=entry.athens_tenant_id,
                    module_code=component_code,
                    defaults={
                        'is_enabled': entry.is_enabled,
                        'enabled_by': entry.enabled_by,
                    }
                )
            
            # Delete old entry
            entry.delete()

def reverse_migration(apps, schema_editor):
    ProjectModule = apps.get_model('control_plane', 'ProjectModule')
    
    # Group components back to categories
    component_projects = {}
    
    ergon_components = ['ergon_tasks', 'ergon_planner', 'ergon_followups', 'ergon_advance', 'ergon_manpower', 'ergon_ledger']
    workforce_components = ['workforce_profile', 'workforce_attendance', 'workforce_leave']
    
    for entry in ProjectModule.objects.filter(module_code__in=ergon_components + workforce_components):
        key = (entry.project_id, entry.athens_tenant_id)
        if key not in component_projects:
            component_projects[key] = {'ergon': [], 'workforce': [], 'enabled_by': entry.enabled_by}
        
        if entry.module_code in ergon_components:
            component_projects[key]['ergon'].append(entry)
        elif entry.module_code in workforce_components:
            component_projects[key]['workforce'].append(entry)
    
    # Create category entries if any component was enabled
    for (project_id, tenant_id), data in component_projects.items():
        if data['ergon']:
            ProjectModule.objects.get_or_create(
                project_id=project_id,
                athens_tenant_id=tenant_id,
                module_code='ergon',
                defaults={'is_enabled': True, 'enabled_by': data['enabled_by']}
            )
            for entry in data['ergon']:
                entry.delete()
        
        if data['workforce']:
            ProjectModule.objects.get_or_create(
                project_id=project_id,
                athens_tenant_id=tenant_id,
                module_code='workforce',
                defaults={'is_enabled': True, 'enabled_by': data['enabled_by']}
            )
            for entry in data['workforce']:
                entry.delete()

class Migration(migrations.Migration):
    dependencies = [
        ('control_plane', '0010_update_module_components'),
    ]

    operations = [
        migrations.RunPython(migrate_to_components, reverse_migration),
    ]
