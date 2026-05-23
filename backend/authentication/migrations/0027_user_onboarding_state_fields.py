from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0026_user_onboarding_profile_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_status',
            field=models.CharField(
                choices=[
                    ('incomplete', 'Incomplete'),
                    ('draft', 'Draft'),
                    ('submitted', 'Submitted'),
                    ('correction_requested', 'Correction Requested'),
                    ('verified', 'Verified'),
                ],
                default='incomplete',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='workflow_approval_status',
            field=models.CharField(
                choices=[
                    ('pending_profile_submission', 'Pending Profile Submission'),
                    ('waiting_admin_approval', 'Waiting Admin Approval'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('correction_requested', 'Correction Requested'),
                ],
                default='pending_profile_submission',
                help_text='Detailed onboarding approval state',
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='training_status',
            field=models.CharField(
                choices=[
                    ('not_started', 'Not Started'),
                    ('pending_induction', 'Pending Induction'),
                    ('in_progress', 'In Progress'),
                    ('completed', 'Completed'),
                ],
                default='not_started',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='access_level',
            field=models.CharField(
                choices=[
                    ('restricted', 'Restricted'),
                    ('verification_pending', 'Verification Pending'),
                    ('training_only', 'Training Only'),
                    ('full_access', 'Full Access'),
                ],
                default='restricted',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='attendance_status',
            field=models.CharField(
                choices=[
                    ('not_required', 'Not Required'),
                    ('pending', 'Pending'),
                    ('verified', 'Verified'),
                ],
                default='pending',
                max_length=30,
            ),
        ),
    ]
