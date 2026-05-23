"""Centralized training ownership isolation."""


def get_training_queryset(user):
    """
    Return a Training queryset scoped to what `user` is allowed to see.

    Security rules:
      superadmin      -> all trainings
      admin/master    -> only trainings created by this user
      role_type=user  -> only trainings where the user has an attendance record
      anything else   -> none

    Do not broaden this with company, tenant, or project filters. Those fields
    are metadata only and are not isolation boundaries for this module.
    """
    from .models import Training

    if user.user_type == 'superadmin':
        return Training.objects.all()

    if getattr(user, 'role_type', 'user') == 'user':
        from .models import TrainingAttendance
        assigned_ids = TrainingAttendance.objects.filter(user=user).values_list('training_id', flat=True)
        return Training.objects.filter(id__in=assigned_ids).distinct()

    if user.user_type == 'masteradmin' or getattr(user, 'role_type', 'user') == 'admin':
        return Training.objects.filter(created_by=user).distinct()

    return Training.objects.none()


def admin_owns_training(user, training):
    """
    Return True if `user` is allowed to manage (write/generate QR/OTP for) `training`.
    Used as an ownership guard in all admin-facing attendance_verification endpoints.
    """
    if user.user_type == 'superadmin':
        return True
    return get_training_queryset(user).filter(pk=training.pk).exists()
