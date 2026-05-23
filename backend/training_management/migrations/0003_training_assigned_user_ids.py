from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('training_management', '0002_add_mode_tenant'),
    ]

    operations = [
        migrations.AddField(
            model_name='training',
            name='assigned_user_ids',
            field=models.JSONField(
                default=list, blank=True,
                help_text='List of user IDs assigned to this training',
            ),
        ),
    ]
