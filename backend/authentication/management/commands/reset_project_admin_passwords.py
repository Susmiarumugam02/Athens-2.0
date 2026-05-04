"""
Run: python manage.py reset_project_admin_passwords
"""
from django.core.management.base import BaseCommand
from authentication.models import User


class Command(BaseCommand):
    help = 'Reset all project admin passwords to Admin@123'

    def handle(self, *args, **kwargs):
        admins = User.objects.filter(user_type='companyuser')
        for u in admins:
            u.set_password('Admin@123')
            u.is_active = True
            u.failed_login_count = 0
            u.locked_until = None
            u.save()
            self.stdout.write(f'FIXED  username={u.username}  email={u.email}  admin_type={u.admin_type}')
        self.stdout.write(self.style.SUCCESS(f'Done — {admins.count()} users reset'))
