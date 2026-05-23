from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0025_add_role_type_approval_fields'),
        ('authentication', '0013_user_induction_attended_user_induction_attended_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_completed',
            field=models.BooleanField(default=False, help_text='Whether user completed profile form'),
        ),
        migrations.AddField(
            model_name='user',
            name='profile_submitted_at',
            field=models.DateTimeField(null=True, blank=True, help_text='When profile was submitted'),
        ),
        migrations.AddField(
            model_name='user',
            name='approved_by',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_users',
                to='authentication.user',
                help_text='Admin who approved this user'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='approved_at',
            field=models.DateTimeField(null=True, blank=True, help_text='When user was approved'),
        ),
        migrations.AddField(
            model_name='user',
            name='rejected_at',
            field=models.DateTimeField(null=True, blank=True, help_text='When user was rejected'),
        ),
        migrations.AddField(
            model_name='user',
            name='employee_id',
            field=models.CharField(max_length=100, blank=True, help_text='Employee ID'),
        ),
        migrations.AddField(
            model_name='user',
            name='emergency_contact',
            field=models.CharField(max_length=255, blank=True, help_text='Emergency contact'),
        ),
        migrations.AddField(
            model_name='user',
            name='blood_group',
            field=models.CharField(max_length=10, blank=True, help_text='Blood group'),
        ),
        migrations.AddField(
            model_name='user',
            name='address',
            field=models.TextField(blank=True, help_text='Address'),
        ),
        migrations.AddField(
            model_name='user',
            name='profile_photo',
            field=models.ImageField(upload_to='profile_photos/', null=True, blank=True, help_text='Profile photo'),
        ),
        migrations.AddField(
            model_name='user',
            name='id_document',
            field=models.FileField(upload_to='id_documents/', null=True, blank=True, help_text='Aadhaar/ID document'),
        ),
        migrations.AddField(
            model_name='user',
            name='safety_experience',
            field=models.TextField(blank=True, help_text='Safety experience'),
        ),
        migrations.AddField(
            model_name='user',
            name='skills',
            field=models.TextField(blank=True, help_text='Skills'),
        ),
        migrations.AddField(
            model_name='user',
            name='language_preference',
            field=models.CharField(max_length=50, default='en', help_text='Language preference'),
        ),
    ]
