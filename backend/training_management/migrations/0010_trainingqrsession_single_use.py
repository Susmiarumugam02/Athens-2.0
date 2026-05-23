from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('training_management', '0009_trainingqrsession_contract_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='trainingqrsession',
            name='is_used',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='trainingqrsession',
            name='used_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='trainingqrsession',
            name='used_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='used_qr_sessions',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
