# Generated migration to update tier choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0014_seed_sample_subscriptions'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tenantservice',
            name='tier',
            field=models.CharField(
                choices=[
                    ('starter', 'Starter'),
                    ('professional', 'Professional'),
                    ('enterprise', 'Enterprise')
                ],
                default='starter',
                max_length=20
            ),
        ),
        migrations.AlterField(
            model_name='athensmodulesubscription',
            name='plan_tier',
            field=models.CharField(
                choices=[
                    ('starter', 'Starter'),
                    ('professional', 'Professional'),
                    ('enterprise', 'Enterprise')
                ],
                default='starter',
                max_length=20
            ),
        ),
        # Update existing data: basic->starter, premium->professional
        migrations.RunSQL(
            sql="""
                UPDATE tenant_services 
                SET tier = CASE 
                    WHEN tier = 'basic' THEN 'starter'
                    WHEN tier = 'premium' THEN 'professional'
                    ELSE tier
                END;
                
                UPDATE athens_module_subscriptions 
                SET plan_tier = CASE 
                    WHEN plan_tier = 'basic' THEN 'starter'
                    WHEN plan_tier = 'premium' THEN 'professional'
                    ELSE plan_tier
                END;
            """,
            reverse_sql="""
                UPDATE tenant_services 
                SET tier = CASE 
                    WHEN tier = 'starter' THEN 'basic'
                    WHEN tier = 'professional' THEN 'premium'
                    ELSE tier
                END;
                
                UPDATE athens_module_subscriptions 
                SET plan_tier = CASE 
                    WHEN plan_tier = 'starter' THEN 'basic'
                    WHEN plan_tier = 'professional' THEN 'premium'
                    ELSE plan_tier
                END;
            """
        ),
    ]
