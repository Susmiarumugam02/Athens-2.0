from django.db import migrations, models


def backfill_session_token(apps, schema_editor):
    TrainingQRSession = apps.get_model('training_management', 'TrainingQRSession')
    for session in TrainingQRSession.objects.filter(session_token=''):
        session.session_token = session.qr_token
        session.save(update_fields=['session_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('training_management', '0008_training_attendance_security_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainingqrsession',
            name='session_token',
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.AddField(
            model_name='trainingqrsession',
            name='qr_image',
            field=models.TextField(blank=True),
        ),
        migrations.RunPython(backfill_session_token, migrations.RunPython.noop),
    ]
