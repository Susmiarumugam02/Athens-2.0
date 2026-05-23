from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('quality', '0001_quality_observation'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='qualityobservation',
            name='assigned_to',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_quality_findings', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='qualityobservation',
            name='immediate_action',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='qualityobservation',
            name='media_evidence',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='qualityobservation',
            name='observation_type',
            field=models.CharField(choices=[('defect', 'Defect'), ('non_conformance', 'Non-Conformance'), ('process_deviation', 'Process Deviation'), ('inspection_finding', 'Inspection Finding'), ('customer_complaint', 'Customer Complaint'), ('supplier_issue', 'Supplier Issue'), ('audit_finding', 'Audit Finding')], default='defect', max_length=30),
        ),
        migrations.AddField(
            model_name='qualityobservation',
            name='priority',
            field=models.CharField(choices=[('low', 'Low'), ('normal', 'Normal'), ('high', 'High'), ('urgent', 'Urgent'), ('critical', 'Critical')], default='normal', max_length=10),
        ),
        migrations.AddField(
            model_name='qualityobservation',
            name='recommended_fix',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='qualityobservation',
            name='status',
            field=models.CharField(choices=[('open', 'Open'), ('reported', 'Reported'), ('under_review', 'Under Review'), ('assigned', 'Assigned'), ('in_progress', 'In Progress'), ('pending_verification', 'Pending Verification'), ('root_cause_analysis', 'Root Cause Analysis'), ('corrective_action', 'Corrective Action'), ('verified', 'Verified'), ('closed', 'Closed')], default='reported', max_length=30),
        ),
        migrations.CreateModel(
            name='QualityFixing',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fixing_id', models.CharField(max_length=50, unique=True)),
                ('corrective_action', models.TextField()),
                ('preventive_action', models.TextField(blank=True)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('completion_date', models.DateTimeField(blank=True, null=True)),
                ('verification_notes', models.TextField(blank=True)),
                ('approval_status', models.CharField(choices=[('draft', 'Draft'), ('assigned', 'Assigned'), ('in_progress', 'In Progress'), ('submitted', 'Submitted for Verification'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('closed', 'Closed')], default='assigned', max_length=20)),
                ('closure_remarks', models.TextField(blank=True)),
                ('before_evidence', models.JSONField(blank=True, default=list)),
                ('after_evidence', models.JSONField(blank=True, default=list)),
                ('escalation_count', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_engineer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quality_fixings', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_quality_fixings', to=settings.AUTH_USER_MODEL)),
                ('finding', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fixings', to='quality.qualityobservation')),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quality_fixings', to='authentication.project')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_quality_fixings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='QualityActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=80)),
                ('from_status', models.CharField(blank=True, max_length=40)),
                ('to_status', models.CharField(blank=True, max_length=40)),
                ('notes', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quality_activity_logs', to=settings.AUTH_USER_MODEL)),
                ('finding', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='activity_logs', to='quality.qualityobservation')),
                ('fixing', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='activity_logs', to='quality.qualityfixing')),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='quality_activity_logs', to='authentication.project')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='qualityobservation',
            index=models.Index(fields=['assigned_to', 'status'], name='quality_qua_assigne_fbb291_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityfixing',
            index=models.Index(fields=['project', 'approval_status'], name='quality_fix_project_87ad05_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityfixing',
            index=models.Index(fields=['assigned_engineer', 'approval_status'], name='quality_fix_assigne_68b75f_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityfixing',
            index=models.Index(fields=['due_date'], name='quality_fix_due_dat_4ce1e1_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityactivitylog',
            index=models.Index(fields=['project', 'created_at'], name='quality_act_project_8e63bf_idx'),
        ),
        migrations.AddIndex(
            model_name='qualityactivitylog',
            index=models.Index(fields=['action'], name='quality_act_action_0339e1_idx'),
        ),
    ]
