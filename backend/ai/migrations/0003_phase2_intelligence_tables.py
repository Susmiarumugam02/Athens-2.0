# Generated for Athens 2.0 Phase 2 PTW intelligence.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai', '0002_enterprise_ai_tables'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AIIncidentPrediction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('permit_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('context', models.JSONField(blank=True, default=dict)),
                ('prediction', models.JSONField(default=dict)),
                ('probability_score', models.PositiveSmallIntegerField(default=0)),
                ('severity_prediction', models.CharField(blank=True, max_length=30)),
                ('source', models.CharField(default='gemini', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_incident_predictions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_incident_predictions',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AIComplianceCheck',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('permit_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('module', models.CharField(default='ptw', max_length=50)),
                ('context', models.JSONField(blank=True, default=dict)),
                ('result', models.JSONField(default=dict)),
                ('compliance_score', models.PositiveSmallIntegerField(default=0)),
                ('blocking', models.BooleanField(default=False)),
                ('source', models.CharField(default='gemini', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_compliance_checks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_compliance_checks',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AIMediaAnalysis',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('permit_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('media_type', models.CharField(choices=[('image', 'Image'), ('document', 'Document')], max_length=20)),
                ('file_name', models.CharField(blank=True, max_length=255)),
                ('mime_type', models.CharField(blank=True, max_length=100)),
                ('analysis', models.JSONField(default=dict)),
                ('severity', models.CharField(blank=True, max_length=30)),
                ('source', models.CharField(default='gemini', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_media_analyses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_media_analyses',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='aiincidentprediction',
            index=models.Index(fields=['tenant_id', '-created_at'], name='ai_incident_tenant__c5d5a6_idx'),
        ),
        migrations.AddIndex(
            model_name='aiincidentprediction',
            index=models.Index(fields=['permit_id', '-created_at'], name='ai_incident_permit__1c2b40_idx'),
        ),
        migrations.AddIndex(
            model_name='aicompliancecheck',
            index=models.Index(fields=['tenant_id', 'module', '-created_at'], name='ai_complian_tenant__fd1d36_idx'),
        ),
        migrations.AddIndex(
            model_name='aicompliancecheck',
            index=models.Index(fields=['permit_id', '-created_at'], name='ai_complian_permit__a7ddfe_idx'),
        ),
        migrations.AddIndex(
            model_name='aimediaanalysis',
            index=models.Index(fields=['tenant_id', 'media_type', '-created_at'], name='ai_media_an_tenant__55f960_idx'),
        ),
        migrations.AddIndex(
            model_name='aimediaanalysis',
            index=models.Index(fields=['permit_id', '-created_at'], name='ai_media_an_permit__a33bb7_idx'),
        ),
    ]
