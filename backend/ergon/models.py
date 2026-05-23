from django.db import models
from authentication.models import User

# Projects
class Project(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    client_name = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=50, default='active')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ergon_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ergon_project'
        indexes = [models.Index(fields=['athens_tenant_id', 'status'])]
        unique_together = ['athens_tenant_id', 'code']

# Departments
class Department(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_department'

# Task Categories
class TaskCategory(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_task_category'

# Tasks (Complete Spec Implementation)
class Task(models.Model):
    TASK_TYPE_CHOICES = [
        ('ad-hoc', 'Task'),
        ('checklist', 'Checklist'),
        ('milestone', 'Milestone'),
        ('timed', 'Urgent')
    ]
    PRIORITY_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High')]
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended')
    ]
    
    athens_tenant_id = models.IntegerField(db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=20, choices=TASK_TYPE_CHOICES, default='ad-hoc')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ergon_assigned_tasks_by')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ergon_assigned_tasks')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    task_category = models.ForeignKey(TaskCategory, on_delete=models.SET_NULL, null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    progress = models.IntegerField(default=0)
    progress_description = models.TextField(blank=True)
    planned_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    sla_hours = models.DecimalField(max_digits=8, decimal_places=4, default=0.25)
    depends_on_task = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    followup_required = models.BooleanField(default=False)
    reminder_notifications = models.BooleanField(default=True)
    track_time = models.BooleanField(default=False)
    is_recurring = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ergon_task'
        indexes = [
            models.Index(fields=['athens_tenant_id', 'status']),
            models.Index(fields=['project', 'planned_date'])
        ]

# Recurring Task Configuration
class RecurringTaskConfig(models.Model):
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('half_yearly', 'Half Yearly'),
        ('annually', 'Annually')
    ]
    
    task = models.OneToOneField(Task, on_delete=models.CASCADE, related_name='recurring_config')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    repeat_every = models.IntegerField(default=1)
    end_recurrence = models.DateField(null=True, blank=True)
    last_generated = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_recurring_task_config'

# Task Progress History
class TaskProgressHistory(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='progress_history')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    progress = models.IntegerField()
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_task_progress_history'
        ordering = ['-created_at']

# Task History (Audit Trail)
class TaskHistory(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    field_name = models.CharField(max_length=100, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_task_history'
        ordering = ['-created_at']

# Contacts
class Contact(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    company = models.CharField(max_length=255, blank=True)
    contact_person = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    project_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_contact'

# Follow-ups
class Followup(models.Model):
    FOLLOWUP_TYPE_CHOICES = [
        ('standalone', 'Standalone'),
        ('task', 'Task-linked')
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rescheduled', 'Rescheduled')
    ]
    
    athens_tenant_id = models.IntegerField(db_index=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name='followups')
    followup_type = models.CharField(max_length=20, choices=FOLLOWUP_TYPE_CHOICES, default='task')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    followup_date = models.DateField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='open')
    completed_at = models.DateTimeField(null=True, blank=True)
    company = models.CharField(max_length=255, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    project_name = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ergon_followup'

class FollowupHistory(models.Model):
    followup = models.ForeignKey(Followup, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=50)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_followup_history'
        ordering = ['-created_at']

# Daily Planner Integration
class DailyTask(models.Model):
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('on_break', 'On Break'),
        ('completed', 'Completed'),
        ('postponed', 'Postponed'),
        ('rolled_over', 'Rolled Over')
    ]
    
    athens_tenant_id = models.IntegerField(db_index=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True)
    original_task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name='daily_originals')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255, default='Untitled Task')
    description = models.TextField(blank=True)
    scheduled_date = models.DateField()
    planned_start_time = models.TimeField(null=True, blank=True)
    planned_duration = models.IntegerField(default=60)
    priority = models.CharField(max_length=20, default='medium')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='not_started')
    progress = models.IntegerField(default=0)
    start_time = models.DateTimeField(null=True, blank=True)
    pause_time = models.DateTimeField(null=True, blank=True)
    pause_start_time = models.DateTimeField(null=True, blank=True)
    resume_time = models.DateTimeField(null=True, blank=True)
    completion_time = models.DateTimeField(null=True, blank=True)
    sla_end_time = models.DateTimeField(null=True, blank=True)
    active_seconds = models.IntegerField(default=0)
    pause_duration = models.IntegerField(default=0)
    postponed_from_date = models.DateField(null=True, blank=True)
    postponed_to_date = models.DateField(null=True, blank=True)
    source_field = models.CharField(max_length=50, blank=True)
    rollover_source_date = models.DateField(null=True, blank=True)
    rollover_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ergon_daily_task'
        indexes = [
            models.Index(fields=['athens_tenant_id', 'scheduled_date']),
            models.Index(fields=['user', 'scheduled_date']),
            models.Index(fields=['status'])
        ]

class DailyTaskHistory(models.Model):
    daily_task = models.ForeignKey(DailyTask, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=50)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_daily_task_history'
        ordering = ['-created_at']

class SLAHistory(models.Model):
    daily_task = models.ForeignKey(DailyTask, on_delete=models.CASCADE, related_name='sla_history')
    action = models.CharField(max_length=50)
    timestamp = models.DateTimeField()
    duration_seconds = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_sla_history'
        ordering = ['-created_at']

# Manpower & Machinery (from previous implementation)
class Manpower(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100)
    contact = models.CharField(max_length=50, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=50, default='available')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_manpower'

class ManpowerAllocation(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    manpower = models.ForeignKey(Manpower, on_delete=models.CASCADE)
    allocation_date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2, default=8)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_manpower_allocation'
        unique_together = ['manpower', 'allocation_date']

class Machinery(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100)
    registration_no = models.CharField(max_length=100, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=50, default='available')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_machinery'

class MachineryAllocation(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    machinery = models.ForeignKey(Machinery, on_delete=models.CASCADE)
    allocation_date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2, default=8)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_machinery_allocation'
        unique_together = ['machinery', 'allocation_date']

# Advance & Expenses
class Advance(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ergon_advances')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    purpose = models.TextField()
    status = models.CharField(max_length=50, default='pending')
    requested_date = models.DateField(auto_now_add=True)
    approved_date = models.DateField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ergon_approved_advances')
    rejection_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_advance'

class Expense(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ergon_expenses')
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    expense_date = models.DateField()
    status = models.CharField(max_length=50, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ergon_approved_expenses')
    rejection_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_expense'

# Financial Ledger
class LedgerEntry(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    entry_type = models.CharField(max_length=50)
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField()
    entry_date = models.DateField()
    reference_no = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ergon_ledger_entries')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_ledger'
        indexes = [models.Index(fields=['athens_tenant_id', 'entry_date'])]

# Customers & Invoices
class Customer(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_customer'

class Invoice(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    invoice_number = models.CharField(max_length=100, unique=True)
    invoice_date = models.DateField()
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=15, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=50, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_invoice'

class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=100)
    reference_no = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_payment'
