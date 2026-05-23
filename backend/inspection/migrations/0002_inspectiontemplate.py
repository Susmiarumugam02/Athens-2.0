import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspection', '0001_ac_cable_form_enhanced_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='InspectionTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('category', models.CharField(
                    choices=[
                        ('safety', 'Safety'),
                        ('ehs', 'EHS'),
                        ('compliance', 'Compliance'),
                        ('monthly_audit', 'Monthly Safety Audit'),
                        ('quality', 'Quality'),
                        ('environmental', 'Environmental'),
                    ],
                    default='safety',
                    max_length=30,
                )),
                ('description', models.TextField(blank=True)),
                ('sections', models.JSONField(default=list)),
                ('header_fields', models.JSONField(default=list)),
                ('is_sample', models.BooleanField(default=False, help_text='Pre-loaded sample template')),
                ('is_active', models.BooleanField(default=True)),
                ('version', models.CharField(default='1.0', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['category', 'name'],
            },
        ),
    ]
