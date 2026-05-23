from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('authentication', '0029_normalize_legacy_onboarding_states'),
    ]

    operations = [
        migrations.CreateModel(
            name='QualityObservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('observation_id', models.CharField(max_length=50, unique=True)),
                ('defect_title', models.CharField(max_length=200)),
                ('product_asset', models.CharField(max_length=200)),
                ('department', models.CharField(max_length=150)),
                ('inspection_area', models.CharField(max_length=200)),
                ('observation_datetime', models.DateTimeField()),
                ('severity', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')], default='medium', max_length=10)),
                ('defect_category', models.CharField(choices=[('surface_defect', 'Surface Defect'), ('paint_defect', 'Paint Defect'), ('welding_defect', 'Welding Defect'), ('dimensional', 'Dimensional Issue'), ('alignment', 'Alignment Issue'), ('corrosion', 'Corrosion'), ('leakage', 'Leakage'), ('material', 'Material Non-Conformance'), ('documentation', 'Documentation Issue'), ('process_deviation', 'Process Deviation'), ('functional', 'Functional Failure'), ('packaging', 'Packaging / Handling')], max_length=30)),
                ('defect_description', models.TextField()),
                ('root_cause', models.TextField(blank=True)),
                ('corrective_action', models.TextField(blank=True)),
                ('preventive_action', models.TextField(blank=True)),
                ('ncr_required', models.BooleanField(default=False)),
                ('ncr_number', models.CharField(blank=True, max_length=60)),
                ('target_completion_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('reported', 'Reported'), ('under_review', 'Under Review'), ('root_cause_analysis', 'Root Cause Analysis'), ('corrective_action', 'Corrective Action'), ('verified', 'Verified'), ('closed', 'Closed')], default='reported', max_length=30)),
                ('verification_notes', models.TextField(blank=True)),
                ('quality_risk_score', models.PositiveSmallIntegerField(default=1, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(16)])),
                ('ai_recommendations', models.JSONField(blank=True, default=list)),
                ('ai_analysis', models.JSONField(blank=True, default=dict)),
                ('voice_transcript', models.TextField(blank=True)),
                ('translated_text', models.TextField(blank=True)),
                ('language_detected', models.CharField(blank=True, max_length=30)),
                ('attachments', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('capa_owner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quality_capa_observations', to=settings.AUTH_USER_MODEL)),
                ('closed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='closed_quality_observations', to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quality_observations', to='authentication.project')),
                ('reporter', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quality_observations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='QualityObservationImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='quality_observations/%Y/%m/%d/')),
                ('caption', models.CharField(blank=True, max_length=255)),
                ('ai_findings', models.JSONField(blank=True, default=list)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('observation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='quality.qualityobservation')),
            ],
        ),
        migrations.AddIndex(
            model_name='qualityobservation',
            index=models.Index(fields=['project', 'status'], name='quality_qua_project_1ed438_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityobservation',
            index=models.Index(fields=['severity', 'defect_category'], name='quality_qua_severit_5b5871_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityobservation',
            index=models.Index(fields=['observation_datetime'], name='quality_qua_observa_3b6921_idx'),
        ),
    ]
