from django.core.management.base import BaseCommand
from superadmin.models import Permission, Role, RolePermission


class Command(BaseCommand):
    help = 'Seed default SuperAdmin permissions and roles'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding SuperAdmin permissions...')
        
        # Define permissions
        permissions_data = [
            # Users
            {'codename': 'superadmin.users.view', 'name': 'View Users', 'module': 'users', 'action': 'view'},
            {'codename': 'superadmin.users.create', 'name': 'Create Users', 'module': 'users', 'action': 'create'},
            {'codename': 'superadmin.users.update', 'name': 'Update Users', 'module': 'users', 'action': 'update'},
            {'codename': 'superadmin.users.delete', 'name': 'Delete Users', 'module': 'users', 'action': 'delete'},
            {'codename': 'superadmin.users.reset_password', 'name': 'Reset User Password', 'module': 'users', 'action': 'reset_password'},
            {'codename': 'superadmin.users.manage_sessions', 'name': 'Manage User Sessions', 'module': 'users', 'action': 'manage_sessions'},
            
            # Roles
            {'codename': 'superadmin.roles.view', 'name': 'View Roles', 'module': 'roles', 'action': 'view'},
            {'codename': 'superadmin.roles.create', 'name': 'Create Roles', 'module': 'roles', 'action': 'create'},
            {'codename': 'superadmin.roles.update', 'name': 'Update Roles', 'module': 'roles', 'action': 'update'},
            {'codename': 'superadmin.roles.delete', 'name': 'Delete Roles', 'module': 'roles', 'action': 'delete'},
            {'codename': 'superadmin.roles.assign_permissions', 'name': 'Assign Permissions to Roles', 'module': 'roles', 'action': 'assign_permissions'},
            
            # Security
            {'codename': 'superadmin.security.view', 'name': 'View Security Settings', 'module': 'security', 'action': 'view'},
            {'codename': 'superadmin.security.update', 'name': 'Update Security Settings', 'module': 'security', 'action': 'update'},
            {'codename': 'superadmin.security.revoke_sessions', 'name': 'Revoke Sessions', 'module': 'security', 'action': 'revoke_sessions'},
            
            # Audit
            {'codename': 'superadmin.audit.view', 'name': 'View Audit Logs', 'module': 'audit', 'action': 'view'},
            {'codename': 'superadmin.audit.export', 'name': 'Export Audit Logs', 'module': 'audit', 'action': 'export'},
            
            # Notifications
            {'codename': 'superadmin.notifications.view', 'name': 'View Notifications', 'module': 'notifications', 'action': 'view'},
            {'codename': 'superadmin.notifications.create', 'name': 'Create Notifications', 'module': 'notifications', 'action': 'create'},
            {'codename': 'superadmin.notifications.update', 'name': 'Update Notifications', 'module': 'notifications', 'action': 'update'},
            {'codename': 'superadmin.notifications.delete', 'name': 'Delete Notifications', 'module': 'notifications', 'action': 'delete'},
            
            # Settings
            {'codename': 'superadmin.settings.view', 'name': 'View Settings', 'module': 'settings', 'action': 'view'},
            {'codename': 'superadmin.settings.update', 'name': 'Update Settings', 'module': 'settings', 'action': 'update'},
            {'codename': 'superadmin.settings.backup', 'name': 'Create Backups', 'module': 'settings', 'action': 'backup'},
            {'codename': 'superadmin.settings.restore', 'name': 'Restore Backups', 'module': 'settings', 'action': 'restore'},
            
            # Analytics
            {'codename': 'superadmin.analytics.view', 'name': 'View Analytics', 'module': 'analytics', 'action': 'view'},
        ]
        
        # Create permissions
        created_count = 0
        for perm_data in permissions_data:
            permission, created = Permission.objects.get_or_create(
                codename=perm_data['codename'],
                defaults={
                    'name': perm_data['name'],
                    'module': perm_data['module'],
                    'action': perm_data['action'],
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created permission: {permission.codename}")
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} permissions'))
        
        # Create default roles
        self.stdout.write('Creating default roles...')
        
        # Super Administrator (all permissions)
        super_admin_role, created = Role.objects.get_or_create(
            name='Super Administrator',
            defaults={
                'description': 'Full access to all SuperAdmin features',
                'is_system_role': True,
            }
        )
        
        if created:
            all_permissions = Permission.objects.all()
            for perm in all_permissions:
                RolePermission.objects.get_or_create(role=super_admin_role, permission=perm)
            self.stdout.write(f"  Created role: {super_admin_role.name} with all permissions")
        
        # Viewer (read-only)
        viewer_role, created = Role.objects.get_or_create(
            name='Viewer',
            defaults={
                'description': 'Read-only access to SuperAdmin features',
                'is_system_role': True,
            }
        )
        
        if created:
            view_permissions = Permission.objects.filter(action='view')
            for perm in view_permissions:
                RolePermission.objects.get_or_create(role=viewer_role, permission=perm)
            self.stdout.write(f"  Created role: {viewer_role.name} with view permissions")
        
        # Security Manager
        security_role, created = Role.objects.get_or_create(
            name='Security Manager',
            defaults={
                'description': 'Manage security settings and audit logs',
                'is_system_role': True,
            }
        )
        
        if created:
            security_permissions = Permission.objects.filter(
                module__in=['security', 'audit']
            )
            for perm in security_permissions:
                RolePermission.objects.get_or_create(role=security_role, permission=perm)
            self.stdout.write(f"  Created role: {security_role.name}")
        
        self.stdout.write(self.style.SUCCESS('SuperAdmin permissions and roles seeded successfully!'))
