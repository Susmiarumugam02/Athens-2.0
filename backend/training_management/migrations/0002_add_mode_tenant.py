from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('training_management', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='training',
            name='mode',
            field=models.CharField(
                max_length=10,
                choices=[('online', 'Online'), ('offline', 'Offline')],
                default='offline',
                help_text='Delivery mode: online (self-complete) or offline (admin marks attendance)',
            ),
        ),
        migrations.AddField(
            model_name='training',
            name='tenant_id',
            field=models.IntegerField(
                null=True, blank=True, db_index=True,
                help_text='Tenant scoping for multi-tenant isolation',
            ),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='completed_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]
