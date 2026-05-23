from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0022_notificationpreference_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='subscription_start_date',
            field=models.DateField(blank=True, help_text='Date from which MasterAdmin can access the system', null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='subscription_end_date',
            field=models.DateField(blank=True, help_text='Date after which MasterAdmin access is revoked', null=True),
        ),
    ]
