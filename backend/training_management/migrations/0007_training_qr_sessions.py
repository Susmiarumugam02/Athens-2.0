import uuid
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0029_normalize_legacy_onboarding_states'),
        ('training_management', '0006_trainingattendance_attendance_method_otp'),
    ]

    operations = [
        migrations.CreateModel(
            name='TrainingQRSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('qr_token', models.CharField(db_index=True, max_length=64, unique=True)),
                ('expires_at', models.DateTimeField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('training', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='qr_sessions',
                    to='training_management.training',
                )),
                ('created_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='created_qr_sessions',
                    to='authentication.user',
                )),
            ],
            options={
                'db_table': 'training_qr_sessions',
                'ordering': ['-created_at'],
            },
        ),
    ]
