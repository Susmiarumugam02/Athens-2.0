from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0029_normalize_legacy_onboarding_states'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='approval_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('waiting_admin_approval', 'Waiting Admin Approval'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                ],
                default='pending',
                help_text='Approval status for regular users created by project admins',
                max_length=30,
            ),
        ),
    ]
