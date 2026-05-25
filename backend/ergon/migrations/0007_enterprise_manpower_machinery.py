from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ergon', '0006_advance_expense_documents'),
    ]

    operations = [
        migrations.AddField(
            model_name='manpower',
            name='skill_type',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='manpower',
            name='assigned_site',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='manpower',
            name='shift',
            field=models.CharField(blank=True, default='General', max_length=50),
        ),
        migrations.AddField(
            model_name='manpower',
            name='availability',
            field=models.CharField(default='available', max_length=50),
        ),
        migrations.AddField(
            model_name='manpower',
            name='notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='machinery',
            name='quantity',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='machinery',
            name='fuel_usage',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='machinery',
            name='working_hours',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='machinery',
            name='assigned_site',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='machinery',
            name='operator_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='machinery',
            name='condition',
            field=models.CharField(default='Good', max_length=50),
        ),
        migrations.AddField(
            model_name='machinery',
            name='maintenance_status',
            field=models.CharField(default='active', max_length=50),
        ),
        migrations.AddField(
            model_name='machinery',
            name='notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.CreateModel(
            name='ResourceAllocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athens_tenant_id', models.IntegerField(db_index=True)),
                ('resource_type', models.CharField(max_length=50)),
                ('resource_id', models.IntegerField()),
                ('site_id', models.IntegerField(blank=True, null=True)),
                ('site_name', models.CharField(blank=True, default='', max_length=255)),
                ('assigned_from', models.DateField(blank=True, null=True)),
                ('assigned_to', models.DateField(blank=True, null=True)),
                ('status', models.CharField(default='active', max_length=50)),
                ('remarks', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'ergon_resource_allocation',
                'indexes': [models.Index(fields=['athens_tenant_id', 'resource_type', 'status'], name='ergon_resou_athens__0c87a3_idx')],
            },
        ),
    ]
