"""
Migration to add athens_tenant_id to induction training models
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inductiontraining', '0001_initial'),  # Adjust based on your latest migration
    ]

    operations = [
        # Add athens_tenant_id to InductionTraining model
        migrations.AddField(
            model_name='inductiontraining',
            name='athens_tenant_id',
            field=models.UUIDField(null=True, help_text='Athens tenant identifier for multi-tenant isolation'),
        ),
        
        # Add athens_tenant_id to InductionAttendance model
        migrations.AddField(
            model_name='inductionattendance',
            name='athens_tenant_id',
            field=models.UUIDField(null=True, help_text='Athens tenant identifier for multi-tenant isolation'),
        ),
        
        # Add indexes for athens_tenant_id
        migrations.AddIndex(
            model_name='inductiontraining',
            index=models.Index(fields=['athens_tenant_id'], name='induction_training_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='inductiontraining',
            index=models.Index(fields=['athens_tenant_id', 'status'], name='induction_training_tenant_status_idx'),
        ),
        migrations.AddIndex(
            model_name='inductionattendance',
            index=models.Index(fields=['athens_tenant_id'], name='induction_attendance_tenant_idx'),
        ),
    ]