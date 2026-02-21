# ERGON Complete Implementation Guide

## PHASE 1: Enhance DailyTask Model (15 min)

### Update ergon/models.py - DailyTask class

Replace existing DailyTask with:

```python
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
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True)
    original_task_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    scheduled_date = models.DateField()
    planned_start_time = models.TimeField(null=True, blank=True)
    planned_duration = models.IntegerField(default=60)
    priority = models.CharField(max_length=20, default='medium')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='not_started')
    completed_percentage = models.IntegerField(default=0)
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
        unique_together = ['task', 'scheduled_date']
        indexes = [
            models.Index(fields=['user', 'scheduled_date']),
            models.Index(fields=['status']),
            models.Index(fields=['rollover_source_date'])
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

class SLAHistory(models.Model):
    daily_task = models.ForeignKey(DailyTask, on_delete=models.CASCADE, related_name='sla_history')
    action = models.CharField(max_length=50)
    timestamp = models.DateTimeField()
    duration_seconds = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_sla_history'
```

## PHASE 2: Add Follow-up Enhancements (10 min)

### Update ergon/models.py - Followup class

```python
class Followup(models.Model):
    FOLLOWUP_TYPE_CHOICES = [
        ('standalone', 'Standalone'),
        ('task', 'Task-linked')
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('postponed', 'Postponed')
    ]
    
    athens_tenant_id = models.IntegerField(db_index=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name='followups')
    followup_type = models.CharField(max_length=20, choices=FOLLOWUP_TYPE_CHOICES, default='task')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    followup_date = models.DateField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    company = models.CharField(max_length=255, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    project_name = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    completed_at = models.DateTimeField(null=True, blank=True)
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
```

## PHASE 3: Create Daily Planner ViewSet (20 min)

### Add to ergon/views.py

```python
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import action

class DailyPlannerViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, ErgonServiceEnabled]
    
    @action(detail=False, methods=['get'])
    def tasks(self, request):
        """Get tasks for specific date"""
        date = request.query_params.get('date', timezone.now().date())
        tenant, _ = get_current_tenant(request.user)
        
        tasks = DailyTask.objects.filter(
            athens_tenant_id=tenant.id,
            user=request.user,
            scheduled_date=date
        ).select_related('task')
        
        return Response(DailyTaskSerializer(tasks, many=True).data)
    
    @action(detail=False, methods=['post'])
    def start_task(self, request):
        """Start task with SLA timer"""
        task_id = request.data.get('task_id')
        daily_task = DailyTask.objects.get(id=task_id, user=request.user)
        
        # Get SLA from linked task or default
        sla_hours = daily_task.task.sla_hours if daily_task.task else 0.25
        
        with transaction.atomic():
            daily_task.status = 'in_progress'
            daily_task.start_time = timezone.now()
            daily_task.sla_end_time = timezone.now() + timedelta(hours=float(sla_hours))
            daily_task.save()
            
            # Log history
            DailyTaskHistory.objects.create(
                daily_task=daily_task,
                action='started',
                created_by=request.user
            )
            
            SLAHistory.objects.create(
                daily_task=daily_task,
                action='start',
                timestamp=timezone.now()
            )
        
        return Response({'status': 'started', 'sla_end_time': daily_task.sla_end_time})
    
    @action(detail=False, methods=['post'])
    def pause_task(self, request):
        """Pause task preserving SLA"""
        task_id = request.data.get('task_id')
        daily_task = DailyTask.objects.get(id=task_id, user=request.user)
        
        with transaction.atomic():
            # Calculate active time
            if daily_task.start_time:
                active = (timezone.now() - daily_task.start_time).total_seconds()
                daily_task.active_seconds += int(active)
            
            daily_task.status = 'on_break'
            daily_task.pause_start_time = timezone.now()
            daily_task.save()
            
            DailyTaskHistory.objects.create(
                daily_task=daily_task,
                action='paused',
                created_by=request.user
            )
        
        return Response({'status': 'paused'})
    
    @action(detail=False, methods=['post'])
    def resume_task(self, request):
        """Resume task with remaining SLA"""
        task_id = request.data.get('task_id')
        daily_task = DailyTask.objects.get(id=task_id, user=request.user)
        
        with transaction.atomic():
            # Calculate pause duration
            if daily_task.pause_start_time:
                pause = (timezone.now() - daily_task.pause_start_time).total_seconds()
                daily_task.pause_duration += int(pause)
            
            # Recalculate SLA end time
            if daily_task.sla_end_time:
                daily_task.sla_end_time = timezone.now() + (daily_task.sla_end_time - daily_task.pause_start_time)
            
            daily_task.status = 'in_progress'
            daily_task.resume_time = timezone.now()
            daily_task.save()
            
            DailyTaskHistory.objects.create(
                daily_task=daily_task,
                action='resumed',
                created_by=request.user
            )
        
        return Response({'status': 'resumed'})
    
    @action(detail=False, methods=['post'])
    def complete_task(self, request):
        """Complete task and sync"""
        task_id = request.data.get('task_id')
        percentage = request.data.get('percentage', 100)
        
        daily_task = DailyTask.objects.get(id=task_id, user=request.user)
        
        with transaction.atomic():
            daily_task.status = 'completed'
            daily_task.completed_percentage = percentage
            daily_task.completion_time = timezone.now()
            daily_task.save()
            
            # Sync with main task
            if daily_task.task:
                daily_task.task.progress = percentage
                if percentage == 100:
                    daily_task.task.status = 'completed'
                daily_task.task.save()
            
            DailyTaskHistory.objects.create(
                daily_task=daily_task,
                action='completed',
                new_value=str(percentage),
                created_by=request.user
            )
        
        return Response({'status': 'completed'})
    
    @action(detail=False, methods=['post'])
    def postpone_task(self, request):
        """Postpone task to new date"""
        task_id = request.data.get('task_id')
        new_date = request.data.get('new_date')
        
        daily_task = DailyTask.objects.get(id=task_id, user=request.user)
        tenant, _ = get_current_tenant(request.user)
        
        with transaction.atomic():
            # Mark current as postponed
            daily_task.status = 'postponed'
            daily_task.postponed_to_date = new_date
            daily_task.save()
            
            # Create new entry
            DailyTask.objects.create(
                athens_tenant_id=tenant.id,
                user=request.user,
                task=daily_task.task,
                title=daily_task.title,
                description=daily_task.description,
                scheduled_date=new_date,
                priority=daily_task.priority,
                postponed_from_date=daily_task.scheduled_date
            )
            
            DailyTaskHistory.objects.create(
                daily_task=daily_task,
                action='postponed',
                new_value=new_date,
                created_by=request.user
            )
        
        return Response({'status': 'postponed'})
    
    @action(detail=False, methods=['post'])
    def rollover(self, request):
        """Manual rollover trigger"""
        tenant, _ = get_current_tenant(request.user)
        today = timezone.now().date()
        
        # Get eligible tasks
        eligible = DailyTask.objects.filter(
            athens_tenant_id=tenant.id,
            user=request.user,
            scheduled_date__lt=today,
            status__in=['not_started', 'in_progress', 'on_break'],
            completed_percentage__lt=100
        )
        
        count = 0
        for task in eligible:
            # Check if already rolled over
            if not DailyTask.objects.filter(
                task=task.task,
                scheduled_date=today,
                rollover_source_date=task.scheduled_date
            ).exists():
                DailyTask.objects.create(
                    athens_tenant_id=tenant.id,
                    user=request.user,
                    task=task.task,
                    title=task.title,
                    description=task.description,
                    scheduled_date=today,
                    priority=task.priority,
                    rollover_source_date=task.scheduled_date,
                    rollover_timestamp=timezone.now()
                )
                task.status = 'rolled_over'
                task.save()
                count += 1
        
        return Response({'rolled_over': count})
```

## PHASE 4: Enhance Follow-up ViewSet (15 min)

### Add to ergon/views.py

```python
class FollowupViewSet(viewsets.ModelViewSet):
    serializer_class = FollowupSerializer
    permission_classes = [IsAuthenticated, ErgonServiceEnabled]
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Followup.objects.none()
        return Followup.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id, created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete follow-up"""
        followup = self.get_object()
        
        with transaction.atomic():
            followup.status = 'completed'
            followup.completed_at = timezone.now()
            followup.save()
            
            FollowupHistory.objects.create(
                followup=followup,
                action='completed',
                created_by=request.user
            )
            
            # Sync with task if linked
            if followup.task:
                followup.task.status = 'completed'
                followup.task.save()
        
        return Response({'status': 'completed'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel follow-up"""
        followup = self.get_object()
        reason = request.data.get('reason', '')
        
        with transaction.atomic():
            followup.status = 'cancelled'
            followup.save()
            
            FollowupHistory.objects.create(
                followup=followup,
                action='cancelled',
                notes=reason,
                created_by=request.user
            )
        
        return Response({'status': 'cancelled'})
    
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule follow-up"""
        followup = self.get_object()
        new_date = request.data.get('new_date')
        reason = request.data.get('reason', '')
        
        with transaction.atomic():
            old_date = followup.followup_date
            followup.followup_date = new_date
            followup.status = 'postponed'
            followup.save()
            
            FollowupHistory.objects.create(
                followup=followup,
                action='rescheduled',
                old_value=str(old_date),
                new_value=new_date,
                notes=reason,
                created_by=request.user
            )
        
        return Response({'status': 'rescheduled'})
    
    @action(detail=False, methods=['get'])
    def reminders(self, request):
        """Get today's reminders"""
        tenant, _ = get_current_tenant(request.user)
        today = timezone.now().date()
        
        reminders = Followup.objects.filter(
            athens_tenant_id=tenant.id,
            followup_date=today,
            status__in=['pending', 'in_progress']
        )
        
        return Response({
            'count': reminders.count(),
            'reminders': FollowupSerializer(reminders, many=True).data
        })
```

## PHASE 5: Update URLs (5 min)

### Update ergon/urls.py

```python
router.register(r'daily-planner', DailyPlannerViewSet, basename='ergon-daily-planner')
router.register(r'followups', FollowupViewSet, basename='ergon-followup')
```

## PHASE 6: Run Migrations (5 min)

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
rm -rf ergon/migrations/*.py
touch ergon/migrations/__init__.py
python manage.py makemigrations ergon
python manage.py migrate --fake ergon 0001
python manage.py check
kill -HUP $(ps aux | grep gunicorn | grep athens2 | head -1 | awk '{print $2}')
```

## PHASE 7: Frontend (30 min)

Create `/var/www/athens-2.0/frontend/src/pages/ergon/DailyPlannerPage.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { ergonApi } from '../../services/ergonApi'

export default function DailyPlannerPage() {
  const [tasks, setTasks] = useState([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadTasks()
  }, [date])

  const loadTasks = async () => {
    const res = await ergonApi.getDailyTasks(date)
    setTasks(res.data)
  }

  const startTask = async (id: number) => {
    await ergonApi.startTask(id)
    loadTasks()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Daily Planner</h1>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mb-4" />
      
      <div className="space-y-4">
        {tasks.map((task: any) => (
          <div key={task.id} className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">{task.title}</h3>
            <p className="text-sm text-gray-600">{task.status}</p>
            {task.status === 'not_started' && (
              <button onClick={() => startTask(task.id)} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
                Start Task
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Add to `ergonApi.ts`:

```typescript
getDailyTasks: (date: string) => apiClient.get(`/api/ergon/daily-planner/tasks/?date=${date}`),
startTask: (id: number) => apiClient.post('/api/ergon/daily-planner/start_task/', { task_id: id }),
pauseTask: (id: number) => apiClient.post('/api/ergon/daily-planner/pause_task/', { task_id: id }),
resumeTask: (id: number) => apiClient.post('/api/ergon/daily-planner/resume_task/', { task_id: id }),
completeTask: (id: number, percentage: number) => apiClient.post('/api/ergon/daily-planner/complete_task/', { task_id: id, percentage }),
```

## Total Time: ~90 minutes

Execute phases 1-6 for backend, then phase 7 for frontend.
