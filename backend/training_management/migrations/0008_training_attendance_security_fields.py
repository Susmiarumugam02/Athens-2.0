from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('training_management', '0007_training_qr_sessions'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainingattendance',
            name='verification_status',
            field=models.CharField(default='pending', max_length=30),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='gps_location',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='device_info',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
