from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0018_tenant_subscription_dates'),
        ('training_management', '0010_trainingqrsession_single_use'),
    ]

    operations = [
        migrations.AddField(
            model_name='training',
            name='company',
            field=models.ForeignKey(
                blank=True,
                db_constraint=False,
                help_text='Company ownership marker for audit/reporting; access is controlled by created_by.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='company_trainings',
                to='control_plane.tenant',
            ),
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(
                    model_name='training',
                    name='tenant_id',
                ),
                migrations.AddField(
                    model_name='training',
                    name='tenant',
                    field=models.ForeignKey(
                        blank=True,
                        db_column='tenant_id',
                        db_constraint=False,
                        help_text='Tenant ownership marker for audit/reporting; access is controlled by created_by.',
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='tenant_trainings',
                        to='control_plane.tenant',
                    ),
                ),
            ],
        ),
    ]
