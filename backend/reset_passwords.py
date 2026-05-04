import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')
django.setup()
from authentication.models import User
for username, pwd in [('A', 'Client@123'), ('B@gmail.com', 'Epc@123'), ('Saran@gmail.com', 'Epc2@123')]:
    u = User.objects.get(username=username)
    u.set_password(pwd)
    u.failed_login_count = 0
    u.locked_until = None
    u.save()
    print(f'Reset: {username} -> {pwd}')
