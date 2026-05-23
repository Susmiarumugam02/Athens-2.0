from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0027_user_onboarding_state_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='approval_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                ],
                default='pending',
                help_text='Approval status for regular users created by project admins',
                max_length=20,
            ),
        ),
    ]
