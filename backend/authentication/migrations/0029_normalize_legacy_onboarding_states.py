from django.db import migrations


def normalize_legacy_onboarding_states(apps, schema_editor):
    User = apps.get_model('authentication', 'User')

    # Existing active regular users predate the stricter onboarding state fields.
    # Preserve their current operational access instead of stranding them in the
    # new default restricted state.
    User.objects.filter(
        user_type='companyuser',
        role_type='user',
        status='active',
    ).update(
        approval_status='approved',
        profile_completed=True,
        profile_status='verified',
        workflow_approval_status='approved',
        training_status='completed',
        attendance_status='verified',
        access_level='full_access',
        module_access_enabled=True,
        onboarding_status='completed',
        induction_attended=True,
        induction_completed=True,
    )

    User.objects.filter(
        user_type='companyuser',
        role_type='user',
        status='approved_pending_induction',
    ).update(
        approval_status='approved',
        profile_status='verified',
        workflow_approval_status='approved',
        training_status='pending_induction',
        attendance_status='pending',
        access_level='training_only',
        module_access_enabled=False,
    )

    User.objects.filter(
        user_type='companyuser',
        role_type='user',
        status='pending_approval',
    ).update(
        profile_status='submitted',
        workflow_approval_status='waiting_admin_approval',
        training_status='not_started',
        access_level='verification_pending',
        module_access_enabled=False,
    )

    User.objects.filter(
        user_type='companyuser',
        role_type='user',
        status='pending_profile',
    ).update(
        profile_status='incomplete',
        workflow_approval_status='pending_profile_submission',
        training_status='not_started',
        access_level='restricted',
        module_access_enabled=False,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0028_alter_user_approval_status'),
    ]

    operations = [
        migrations.RunPython(normalize_legacy_onboarding_states, migrations.RunPython.noop),
    ]
