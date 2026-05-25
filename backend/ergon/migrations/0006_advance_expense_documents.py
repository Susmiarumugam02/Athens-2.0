from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ergon', '0005_contact_designation_contact_name_contact_status_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='advance',
            name='advance_type',
            field=models.CharField(default='Project Advance', max_length=100),
        ),
        migrations.AddField(
            model_name='advance',
            name='approved_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='advance',
            name='reason',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='advance',
            name='repayment_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='advance',
            name='salary_recovery',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='advance',
            name='supporting_document',
            field=models.FileField(blank=True, null=True, upload_to='ergon/advances/'),
        ),
        migrations.AddField(
            model_name='advance',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='ergon/advances/'),
        ),
        migrations.AddField(
            model_name='advance',
            name='notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='advance',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='ergon_created_advances', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='expense',
            name='work_category',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='expense',
            name='approval_status',
            field=models.CharField(default='submitted', max_length=50),
        ),
        migrations.AddField(
            model_name='expense',
            name='reimbursement_status',
            field=models.CharField(default='pending', max_length=50),
        ),
        migrations.AddField(
            model_name='expense',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='expense',
            name='receipt',
            field=models.FileField(blank=True, null=True, upload_to='ergon/expenses/'),
        ),
        migrations.AddField(
            model_name='expense',
            name='receipt_path',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='expense',
            name='payment_method',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='expense',
            name='vendor_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='expense',
            name='bill_number',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='expense',
            name='gst_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='expense',
            name='gst_included',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='expense',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='ergon_created_expenses', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='AdvanceApprovalLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=100)),
                ('comments', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('advance', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='approval_logs', to='ergon.advance')),
                ('performed_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='ergon_advance_approval_actions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ergon_advance_approval_log',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='ExpenseApprovalLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=100)),
                ('comments', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expense', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='approval_logs', to='ergon.expense')),
                ('performed_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='ergon_expense_approval_actions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ergon_expense_approval_log',
                'ordering': ['created_at'],
            },
        ),
    ]
