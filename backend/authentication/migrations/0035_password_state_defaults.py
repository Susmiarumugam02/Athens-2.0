from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0034_user_password_tracking'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='is_temporary_password',
            field=models.BooleanField(default=True, help_text='Whether current password is temporary and must be changed'),
        ),
        migrations.AlterField(
            model_name='user',
            name='must_change_password',
            field=models.BooleanField(default=True, help_text='Whether user must change password before accessing modules (set after induction completion)'),
        ),
    ]
