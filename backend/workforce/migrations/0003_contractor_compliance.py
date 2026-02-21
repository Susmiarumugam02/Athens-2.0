# Generated migration for contractor compliance architecture

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('workforce', '0002_payrollsettings_rename_check_in_attendance_in_time_and_more'),
        ('authentication', '0001_initial'),
    ]

    operations = [
        # TABLE 1: Contractor Master
        migrations.CreateModel(
            name='ContractorMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athens_tenant_id', models.IntegerField(db_index=True)),
                ('company_type', models.CharField(choices=[('contractor', 'Contractor'), ('epc', 'EPC')], default='contractor', max_length=20)),
                ('company_name', models.CharField(max_length=255)),
                ('company_address', models.TextField()),
                ('contact_person', models.CharField(max_length=200)),
                ('contact_number', models.CharField(max_length=20)),
                ('email', models.EmailField(max_length=254)),
                ('pan_number', models.CharField(blank=True, max_length=20)),
                ('gst_number', models.CharField(blank=True, max_length=20)),
                ('status', models.CharField(choices=[('active', 'Active'), ('inactive', 'Inactive'), ('suspended', 'Suspended')], default='active', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'contractor_master',
                'unique_together': {('athens_tenant_id', 'company_name')},
            },
        ),
        
        # TABLE 2: Contractor Compliance
        migrations.CreateModel(
            name='ContractorCompliance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('branch_id', models.IntegerField(help_text='Branch/Factory ID where contractor operates')),
                ('clra_license_number', models.CharField(max_length=100)),
                ('license_valid_from', models.DateField()),
                ('license_valid_to', models.DateField()),
                ('max_worker_limit', models.IntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ('pf_code', models.CharField(blank=True, max_length=100)),
                ('esi_code', models.CharField(blank=True, max_length=100)),
                ('labour_registration_number', models.CharField(blank=True, max_length=100)),
                ('last_return_filed', models.DateField(blank=True, help_text='Last CLRA return filing date', null=True)),
                ('is_compliant', models.BooleanField(default=True)),
                ('compliance_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('contractor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='compliance_records', to='workforce.contractormaster')),
            ],
            options={
                'db_table': 'contractor_compliance',
                'unique_together': {('contractor', 'branch_id')},
            },
        ),
        
        # TABLE 3: Contract Labour Deployment
        migrations.CreateModel(
            name='ContractLabourDeployment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('athens_tenant_id', models.IntegerField(db_index=True)),
                ('branch_id', models.IntegerField(help_text='Branch/Factory ID')),
                ('wage_rate', models.DecimalField(decimal_places=2, max_digits=10)),
                ('deployment_start', models.DateField()),
                ('deployment_end', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('completed', 'Completed'), ('terminated', 'Terminated')], default='active', max_length=20)),
                ('work_order_number', models.CharField(blank=True, max_length=100)),
                ('work_order_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('contractor_compliance', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='deployments', to='workforce.contractorcompliance')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contract_deployments', to='workforce.employee')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contract_deployments', to='authentication.project')),
            ],
            options={
                'db_table': 'contract_labour_deployment',
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='contractormaster',
            index=models.Index(fields=['athens_tenant_id', 'status'], name='contractor_m_athens__idx'),
        ),
        migrations.AddIndex(
            model_name='contractormaster',
            index=models.Index(fields=['company_type'], name='contractor_m_company_idx'),
        ),
        migrations.AddIndex(
            model_name='contractormaster',
            index=models.Index(fields=['email'], name='contractor_m_email_idx'),
        ),
        migrations.AddIndex(
            model_name='contractorcompliance',
            index=models.Index(fields=['license_valid_to'], name='contractor_c_license_idx'),
        ),
        migrations.AddIndex(
            model_name='contractorcompliance',
            index=models.Index(fields=['is_compliant'], name='contractor_c_complia_idx'),
        ),
        migrations.AddIndex(
            model_name='contractlabourdeployment',
            index=models.Index(fields=['athens_tenant_id', 'status'], name='contract_la_athens__idx'),
        ),
        migrations.AddIndex(
            model_name='contractlabourdeployment',
            index=models.Index(fields=['project', 'status'], name='contract_la_project_idx'),
        ),
        migrations.AddIndex(
            model_name='contractlabourdeployment',
            index=models.Index(fields=['contractor_compliance'], name='contract_la_contrac_idx'),
        ),
        migrations.AddIndex(
            model_name='contractlabourdeployment',
            index=models.Index(fields=['deployment_start', 'deployment_end'], name='contract_la_deploym_idx'),
        ),
    ]
