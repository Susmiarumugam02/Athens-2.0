"""
Migration to add athens_tenant_id to TBT models
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tbt', '0001_initial'),  # Adjust based on your latest migration
    ]

    operations = [
        # Add athens_tenant_id to ToolboxTalk model
        migrations.AddField(
            model_name='toolboxtalk',
            name='athens_tenant_id',
            field=models.UUIDField(null=True, help_text='Athens tenant identifier for multi-tenant isolation'),
        ),
        
        # Add athens_tenant_id to ToolboxTalkAttendance model
        migrations.AddField(
            model_name='toolboxtalkattendance',
            name='athens_tenant_id',
            field=models.UUIDField(null=True, help_text='Athens tenant identifier for multi-tenant isolation'),
        ),
        
        # Add indexes for athens_tenant_id
        migrations.AddIndex(
            model_name='toolboxtalk',
            index=models.Index(fields=['athens_tenant_id'], name='tbt_toolboxtalk_tenant_idx'),
        ),
        migrations.AddIndex(
            model_name='toolboxtalk',
            index=models.Index(fields=['athens_tenant_id', 'status'], name='tbt_toolboxtalk_tenant_status_idx'),
        ),
        migrations.AddIndex(
            model_name='toolboxtalkattendance',
            index=models.Index(fields=['athens_tenant_id'], name='tbt_attendance_tenant_idx'),
        ),
    ]