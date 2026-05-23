# Generated migration to populate employee isolation fields

from django.db import migrations


def populate_isolation_fields(apps, schema_editor):
    """
    Populate created_by_admin_type and organization_type for existing employees
    by matching them with User records.
    """
    Employee = apps.get_model('workforce', 'Employee')
    User = apps.get_model('authentication', 'User')
    
    for employee in Employee.objects.all():
        # Try to find matching user by name
        matching_users = User.objects.filter(
            name__iexact=employee.full_name,
            user_type='companyuser'
        )
        
        if matching_users.exists():
            user = matching_users.first()
            creator = user.created_by
            
            if creator:
                employee.created_by_admin = creator
                employee.created_by_admin_type = getattr(creator, 'admin_type', '') or 'unknown'
                employee.organization_type = getattr(user, 'company_type', '') or getattr(creator, 'admin_type', '') or 'unknown'
                employee.save(update_fields=['created_by_admin', 'created_by_admin_type', 'organization_type'])
                print(f"Updated employee {employee.id} ({employee.full_name}) with admin_type={employee.created_by_admin_type}")


def reverse_func(apps, schema_editor):
    """Reverse migration - clear the fields"""
    Employee = apps.get_model('workforce', 'Employee')
    Employee.objects.all().update(
        created_by_admin=None,
        created_by_admin_type='',
        organization_type=''
    )


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0011_employee_created_by_admin_and_more'),
        ('authentication', '0025_add_role_type_approval_fields'),
    ]

    operations = [
        migrations.RunPython(populate_isolation_fields, reverse_func),
    ]
