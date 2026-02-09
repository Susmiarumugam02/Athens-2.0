# Generated migration for Athens Control Plane

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0003_masteradmin_department_masteradmin_designation_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='AthensTenantLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('enabled_modules', models.JSONField(default=list, help_text='List of enabled Athens modules')),
                ('enabled_menus', models.JSONField(default=list, help_text='List of enabled menu items')),
                ('is_active', models.BooleanField(default=True)),
                ('synced_at', models.DateTimeField(auto_now_add=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='athens_link', to='control_plane.tenant')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='authentication.user', related_name='created_athens_links')),
            ],
            options={
                'verbose_name': 'Athens Tenant Link',
                'verbose_name_plural': 'Athens Tenant Links',
                'db_table': 'athens_tenant_links',
            },
        ),
        migrations.CreateModel(
            name='AthensModuleSubscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('module_code', models.CharField(max_length=50)),
                ('enabled', models.BooleanField(default=True)),
                ('plan_tier', models.CharField(max_length=20, choices=[('basic', 'Basic'), ('premium', 'Premium'), ('enterprise', 'Enterprise')], default='basic')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='athens_module_subscriptions', to='control_plane.tenant')),
            ],
            options={
                'verbose_name': 'Athens Module Subscription',
                'verbose_name_plural': 'Athens Module Subscriptions',
                'db_table': 'athens_module_subscriptions',
                'unique_together': {('tenant', 'module_code')},
            },
        ),
        migrations.CreateModel(
            name='AthensAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=30, choices=[
                    ('tenant_created', 'Tenant Created'),
                    ('tenant_updated', 'Tenant Updated'),
                    ('tenant_suspended', 'Tenant Suspended'),
                    ('tenant_reactivated', 'Tenant Reactivated'),
                    ('tenant_synced', 'Tenant Synced'),
                    ('modules_updated', 'Modules Updated'),
                    ('master_created', 'Master Created'),
                    ('master_updated', 'Master Updated'),
                    ('master_deleted', 'Master Deleted'),
                    ('subscription_updated', 'Subscription Updated'),
                ])),
                ('entity_type', models.CharField(max_length=50)),
                ('entity_id', models.CharField(max_length=50)),
                ('before_data', models.JSONField(blank=True, null=True)),
                ('after_data', models.JSONField(blank=True, null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='authentication.user')),
            ],
            options={
                'verbose_name': 'Athens Audit Log',
                'verbose_name_plural': 'Athens Audit Logs',
                'db_table': 'athens_audit_logs',
                'ordering': ['-created_at'],
            },
        ),
    ]
