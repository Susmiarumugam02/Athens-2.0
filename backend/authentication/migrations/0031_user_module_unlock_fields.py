from django.db import migrations, models


def backfill_unlock_fields(apps, schema_editor):
    User = apps.get_model('authentication', 'User')
    User.objects.filter(module_access_enabled=True).update(
        attendance_verified=True,
        modules_unlocked=True,
        access_status='active',
    )
    User.objects.filter(module_access_enabled=False).update(
        attendance_verified=False,
        modules_unlocked=False,
        access_status='restricted',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0030_waiting_admin_approval_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='attendance_verified',
            field=models.BooleanField(default=False, help_text='Whether induction attendance has been verified'),
        ),
        migrations.AddField(
            model_name='user',
            name='modules_unlocked',
            field=models.BooleanField(default=False, help_text='Whether all assigned platform modules are unlocked'),
        ),
        migrations.AddField(
            model_name='user',
            name='access_status',
            field=models.CharField(default='restricted', help_text='Effective platform access status', max_length=30),
        ),
        migrations.RunPython(backfill_unlock_fields, migrations.RunPython.noop),
    ]
