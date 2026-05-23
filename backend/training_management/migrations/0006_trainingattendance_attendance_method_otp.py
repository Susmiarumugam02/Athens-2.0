from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('training_management', '0005_expand_training_type_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainingattendance',
            name='attendance_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('qr', 'QR Code'),
                    ('otp', 'OTP'),
                    ('face', 'Face Verification'),
                    ('admin', 'Admin Manual'),
                    ('geo', 'Geolocation'),
                    ('online', 'Online Self-Complete'),
                ],
                null=True, blank=True,
            ),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='otp_code',
            field=models.CharField(max_length=6, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='otp_expires_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='verified_by',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='geo_lat',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='trainingattendance',
            name='geo_lng',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='training',
            name='otp_code',
            field=models.CharField(max_length=6, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='training',
            name='otp_expires_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='training',
            name='site_lat',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='training',
            name='site_lng',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='training',
            name='geo_radius_meters',
            field=models.IntegerField(default=200),
        ),
    ]
