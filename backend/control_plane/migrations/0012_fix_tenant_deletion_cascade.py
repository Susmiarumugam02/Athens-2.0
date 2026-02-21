# Fix tenant deletion - Update FK constraints to CASCADE

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0011_migrate_to_components'),
    ]

    operations = [
        migrations.RunSQL(
            # Drop and recreate FK constraints with CASCADE
            sql=[
                # athens_module_subscriptions
                'ALTER TABLE athens_module_subscriptions DROP CONSTRAINT IF EXISTS athens_module_subscriptions_tenant_id_25ea938e_fk_tenants_id;',
                'ALTER TABLE athens_module_subscriptions ADD CONSTRAINT athens_module_subscriptions_tenant_id_25ea938e_fk_tenants_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;',
                
                # athens_tenant_links
                'ALTER TABLE athens_tenant_links DROP CONSTRAINT IF EXISTS athens_tenant_links_tenant_id_d0e8e8e8_fk_tenants_id;',
                'ALTER TABLE athens_tenant_links ADD CONSTRAINT athens_tenant_links_tenant_id_d0e8e8e8_fk_tenants_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;',
                
                # projects
                'ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_company_id_fkey;',
                'ALTER TABLE projects ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;',
                
                # subscriptions
                'ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_fkey;',
                'ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;',
                
                # tenant_services
                'ALTER TABLE tenant_services DROP CONSTRAINT IF EXISTS tenant_services_tenant_id_fkey;',
                'ALTER TABLE tenant_services ADD CONSTRAINT tenant_services_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;',
                
                # users (SET NULL instead of CASCADE to preserve user records)
                'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;',
                'ALTER TABLE users ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;',
            ],
            reverse_sql=[
                # Reverse to NO ACTION
                'ALTER TABLE athens_module_subscriptions DROP CONSTRAINT athens_module_subscriptions_tenant_id_25ea938e_fk_tenants_id;',
                'ALTER TABLE athens_module_subscriptions ADD CONSTRAINT athens_module_subscriptions_tenant_id_25ea938e_fk_tenants_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) DEFERRABLE INITIALLY DEFERRED;',
                
                'ALTER TABLE athens_tenant_links DROP CONSTRAINT athens_tenant_links_tenant_id_d0e8e8e8_fk_tenants_id;',
                'ALTER TABLE athens_tenant_links ADD CONSTRAINT athens_tenant_links_tenant_id_d0e8e8e8_fk_tenants_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) DEFERRABLE INITIALLY DEFERRED;',
                
                'ALTER TABLE projects DROP CONSTRAINT projects_company_id_fkey;',
                'ALTER TABLE projects ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES tenants(id) DEFERRABLE INITIALLY DEFERRED;',
                
                'ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_tenant_id_fkey;',
                'ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) DEFERRABLE INITIALLY DEFERRED;',
                
                'ALTER TABLE tenant_services DROP CONSTRAINT tenant_services_tenant_id_fkey;',
                'ALTER TABLE tenant_services ADD CONSTRAINT tenant_services_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) DEFERRABLE INITIALLY DEFERRED;',
                
                'ALTER TABLE users DROP CONSTRAINT users_tenant_id_fkey;',
                'ALTER TABLE users ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) DEFERRABLE INITIALLY DEFERRED;',
            ],
        ),
    ]
