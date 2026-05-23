from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ptw', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RiskAssessment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('probability', models.PositiveSmallIntegerField(default=1)),
                ('severity', models.PositiveSmallIntegerField(default=1)),
                ('risk_score', models.PositiveSmallIntegerField(default=1)),
                ('risk_level', models.CharField(choices=[('low','Low'),('medium','Medium'),('high','High'),('extreme','Extreme')], default='low', max_length=10)),
                ('hazards', models.JSONField(default=list)),
                ('other_hazards', models.TextField(blank=True)),
                ('risk_factors', models.JSONField(default=list)),
                ('control_measures', models.TextField(blank=True)),
                ('emergency_procedures', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('permit', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='risk_assessment_detail', to='ptw.permit')),
                ('assessed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='risk_assessments', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'ptw_risk_assessment'},
        ),
    ]
