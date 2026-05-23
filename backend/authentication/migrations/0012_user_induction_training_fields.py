# Generated migration for induction training access control

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0025_add_role_type_approval_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='induction_completed',
            field=models.BooleanField(default=False, help_text='Whether user has completed mandatory induction training'),
        ),
        migrations.AddField(
            model_name='user',
            name='induction_completed_at',
            field=models.DateTimeField(null=True, blank=True, help_text='When induction training was completed'),
        ),
        migrations.AddField(
            model_name='user',
            name='induction_score',
            field=models.FloatField(null=True, blank=True, help_text='Score achieved in induction assessment'),
        ),
        migrations.AddField(
            model_name='user',
            name='onboarding_status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('pending_training', 'Pending Training'),
                    ('training_in_progress', 'Training In Progress'),
                    ('training_completed', 'Training Completed'),
                    ('completed', 'Completed'),
                ],
                default='pending_training',
                help_text='User onboarding status'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='module_access_enabled',
            field=models.BooleanField(default=False, help_text='Whether user can access operational modules'),
        ),
        migrations.AddField(
            model_name='user',
            name='training_progress',
            field=models.JSONField(default=dict, blank=True, help_text='Training progress tracking data'),
        ),
    ]
