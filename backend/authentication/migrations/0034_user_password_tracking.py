from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0033_add_must_change_password'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_temporary_password',
            field=models.BooleanField(default=False, help_text='Whether current password is temporary and must be changed'),
        ),
        migrations.AddField(
            model_name='user',
            name='password_changed',
            field=models.BooleanField(default=False, help_text='Whether user has changed from the initial temporary password'),
        ),
    ]
