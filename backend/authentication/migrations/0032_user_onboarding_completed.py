from django.db import migrations, models


def backfill_onboarding_completed(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    User.objects.filter(
        modules_unlocked=True,
        attendance_verified=True,
        induction_completed=True,
        access_status='active',
    ).update(onboarding_completed=True)
    User.objects.filter(onboarding_status='completed').update(onboarding_completed=True)


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0031_user_module_unlock_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='onboarding_completed',
            field=models.BooleanField(default=False, help_text='Whether employee onboarding is fully completed'),
        ),
        migrations.RunPython(backfill_onboarding_completed, migrations.RunPython.noop),
    ]
