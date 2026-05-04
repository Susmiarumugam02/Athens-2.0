# Remove JSON contractor and EPC fields from Project model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0014_alter_user_company_logo'),
        ('workforce', '0004_migrate_contractor_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='project',
            name='contractor_company_ids',
        ),
        migrations.RemoveField(
            model_name='project',
            name='epc_company_ids',
        ),
    ]
