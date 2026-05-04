from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0023_user_subscription_dates'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='subscription_start_date',
        ),
        migrations.RemoveField(
            model_name='user',
            name='subscription_end_date',
        ),
    ]
