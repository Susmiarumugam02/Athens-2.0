"""
Migration to add athens_tenant_id to worker models
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('worker', '0001_initial'),  # Adjust based on your latest migration
    ]

    operations = [
        # Add athens_tenant_id to Worker model
        migrations.AddField(
            model_name='worker',
            name='athens_tenant_id',
            field=models.UUIDField(null=True, help_text='Athens tenant identifier for multi-tenant isolation'),
        ),
        
        # Add index for athens_tenant_id
        migrations.AddIndex(
            model_name='worker',
            index=models.Index(fields=['athens_tenant_id'], name='worker_worker_tenant_idx'),
        ),
        
        # Add composite index for tenant + status for common queries
        migrations.AddIndex(
            model_name='worker',
            index=models.Index(fields=['athens_tenant_id', 'status'], name='worker_worker_tenant_status_idx'),
        ),
    ]