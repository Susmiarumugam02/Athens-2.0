from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0017_add_tenant_approval_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='subscription_start_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='subscription_end_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
