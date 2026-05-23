# Generated for Athens 2.0 enterprise AI persistence.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AIHazardPattern',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('module', models.CharField(default='ptw', max_length=50)),
                ('permit_type', models.CharField(blank=True, max_length=100)),
                ('location', models.CharField(blank=True, max_length=255)),
                ('work_nature', models.CharField(blank=True, max_length=255)),
                ('hazard', models.CharField(max_length=255)),
                ('controls', models.JSONField(blank=True, default=list)),
                ('ppe', models.JSONField(blank=True, default=list)),
                ('occurrence_count', models.PositiveIntegerField(default=1)),
                ('risk_level', models.CharField(blank=True, max_length=30)),
                ('source', models.CharField(default='ai', max_length=50)),
                ('last_seen_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'ai_hazard_patterns',
                'ordering': ['-last_seen_at'],
            },
        ),
        migrations.CreateModel(
            name='AIVoiceLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('module', models.CharField(blank=True, max_length=50)),
                ('field_name', models.CharField(blank=True, max_length=100)),
                ('source_language', models.CharField(max_length=10)),
                ('transcript', models.TextField()),
                ('professional_english', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('success', 'Success'), ('failed', 'Failed')], default='success', max_length=20)),
                ('error_message', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_voice_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_voice_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AIRecommendation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tenant_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('module', models.CharField(blank=True, max_length=50)),
                ('recommendation_type', models.CharField(choices=[('ppe', 'PPE'), ('control', 'Control'), ('precaution', 'Precaution'), ('workflow', 'Workflow')], default='control', max_length=30)),
                ('context', models.JSONField(blank=True, default=dict)),
                ('recommendations', models.JSONField(default=list)),
                ('source', models.CharField(default='gemini', max_length=50)),
                ('accepted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_recommendations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_recommendations',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='aihazardpattern',
            index=models.Index(fields=['tenant_id', 'module', 'permit_type'], name='ai_hazard_p_tenant__a9880d_idx'),
        ),
        migrations.AddIndex(
            model_name='aihazardpattern',
            index=models.Index(fields=['tenant_id', 'location'], name='ai_hazard_p_tenant__0662ce_idx'),
        ),
        migrations.AddIndex(
            model_name='aivoicelog',
            index=models.Index(fields=['tenant_id', '-created_at'], name='ai_voice_lo_tenant__bc5da8_idx'),
        ),
        migrations.AddIndex(
            model_name='aivoicelog',
            index=models.Index(fields=['module', 'field_name'], name='ai_voice_lo_module_8ccd7e_idx'),
        ),
        migrations.AddIndex(
            model_name='airecommendation',
            index=models.Index(fields=['tenant_id', 'module', '-created_at'], name='ai_recommen_tenant__32e0aa_idx'),
        ),
        migrations.AddIndex(
            model_name='airecommendation',
            index=models.Index(fields=['user', '-created_at'], name='ai_recommen_user_id_4b41b8_idx'),
        ),
    ]
