# TBT (ToolboxTalk) API Endpoints Analysis

## Overview
The TBT module is a separate training module from InductionTraining and JobTraining. It handles daily safety briefings with face recognition attendance tracking.

---

## 1. API Routing

### Main URL Configuration
**File:** `backend/athens2/urls.py`
```python
path('api/tbt/', include('tbt.urls')),
```

**Base Endpoint:** `/api/tbt/`

---

## 2. TBT API Endpoints

### File: `backend/tbt/urls.py`

```
POST   /api/tbt/create/               → create_toolbox_talk() - Create new TBT
GET    /api/tbt/list/                 → ToolboxTalkViewSet.list() - Get all TBTs
GET    /api/tbt/<int:pk>/             → ToolboxTalkViewSet.retrieve() - Get single TBT
PUT    /api/tbt/update/<int:pk>/      → ToolboxTalkViewSet.update() - Update TBT
PATCH  /api/tbt/update/<int:pk>/      → ToolboxTalkViewSet.partial_update() - Partial update
DELETE /api/tbt/delete/<int:pk>/      → ToolboxTalkViewSet.destroy() - Delete TBT
GET    /api/tbt/<int:pk>/attendance/  → ToolboxTalkViewSet.attendance() - Get attendance records
GET    /api/tbt/users/list/           → user_list() - Get admin users dropdown
GET    /api/tbt/users/search/         → user_search() - Search admin users
GET    /api/tbt/trained-personnel/    → trained_personnel() - Get trained workers for TBT
POST   /api/tbt/attendance/           → submit_attendance() - Submit TBT attendance with face recognition
```

---

## 3. Model Definition

### File: `backend/tbt/models.py`

#### ToolboxTalk Model
```python
class ToolboxTalk(models.Model):
    STATUS_CHOICES = (
        ('planned', 'Planned'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    DURATION_UNIT_CHOICES = (
        ('minutes', 'Minutes'),
        ('hours', 'Hours'),
    )
    
    # Multi-tenant Isolation ✅
    athens_tenant_id = UUIDField(null=True, blank=True)
    
    # Core fields
    title = CharField(max_length=255)
    description = TextField(blank=True)
    date = DateField()
    duration = PositiveIntegerField(default=30)
    duration_unit = CharField(max_length=10, choices=DURATION_UNIT_CHOICES, default='minutes')
    location = CharField(max_length=255)
    conducted_by = CharField(max_length=255)
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    
    # Relations
    project = ForeignKey('authentication.Project', on_delete=CASCADE, related_name='toolbox_talks', null=True, blank=True)
    created_by = ForeignKey(User, on_delete=CASCADE, related_name='created_toolbox_talks')
    
    # Attendance & QR
    evidence_photo = ImageField(upload_to='toolbox_talk_evidence/', blank=True, null=True)
    join_code = CharField(max_length=12, blank=True, null=True)  # 6-digit code
    qr_token = CharField(max_length=64, blank=True, null=True)
    qr_expires_at = DateTimeField(blank=True, null=True)
    
    # Timestamps
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

#### ToolboxTalkAttendance Model
```python
class ToolboxTalkAttendance(models.Model):
    STATUS_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
    )
    
    # Multi-tenant Isolation ✅
    athens_tenant_id = UUIDField(null=True, blank=True)
    
    # Relations
    toolbox_talk = ForeignKey(ToolboxTalk, on_delete=CASCADE, related_name='attendance_records')
    worker = ForeignKey(Worker, on_delete=CASCADE, related_name='toolbox_talk_attendance')
    
    # Attendance data
    status = CharField(max_length=10, choices=STATUS_CHOICES, default='present')
    attendance_photo = ImageField(upload_to='toolbox_talk_attendance/', blank=True, null=True)
    match_score = FloatField(default=0)  # Face recognition confidence score
    timestamp = DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('toolbox_talk', 'worker')
```

---

## 4. Serializers

### File: `backend/tbt/serializers.py`

#### ToolboxTalkSerializer
```python
class ToolboxTalkSerializer(serializers.ModelSerializer):
    attendance_records = ToolboxTalkAttendanceSerializer(many=True, read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = ToolboxTalk
        fields = [
            'id', 'title', 'description', 'date', 'duration', 'duration_unit', 
            'location', 'conducted_by', 'status', 'created_by', 'created_by_username',
            'created_by_details', 'created_at', 'updated_at', 
            'attendance_records', 'evidence_photo', 'join_code', 'qr_token', 'qr_expires_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'created_by_details', 'created_by', 
            'created_by_username', 'join_code', 'qr_token', 'qr_expires_at'
        ]
```

#### ToolboxTalkAttendanceSerializer
```python
class ToolboxTalkAttendanceSerializer(serializers.ModelSerializer):
    worker_name = serializers.SerializerMethodField()
    worker_photo = serializers.SerializerMethodField()
    
    class Meta:
        model = ToolboxTalkAttendance
        fields = [
            'id', 'toolbox_talk_id', 'worker_id', 'worker_name', 
            'worker_photo', 'attendance_photo', 'status', 
            'match_score', 'timestamp'
        ]
        read_only_fields = ['timestamp']
```

---

## 5. Views Implementation

### File: `backend/tbt/views.py`

#### 5.1 Create Endpoint
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_toolbox_talk(request):
    """Create a new toolbox talk"""
    ensure_tenant_context(request)
    enforce_collaboration_read_only(request, domain='tbt')
    
    serializer = ToolboxTalkSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(
            created_by=request.user, 
            project=ensure_project(request)
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**Request Example:**
```json
{
    "title": "Daily Safety Briefing",
    "description": "Discussion on proper use of PPE",
    "date": "2024-04-30",
    "duration": 15,
    "duration_unit": "minutes",
    "location": "Site A",
    "conducted_by": "John Admin",
    "status": "planned"
}
```

**Response (201 Created):**
```json
{
    "id": 1,
    "title": "Daily Safety Briefing",
    "description": "Discussion on proper use of PPE",
    "date": "2024-04-30",
    "duration": 15,
    "duration_unit": "minutes",
    "location": "Site A",
    "conducted_by": "John Admin",
    "status": "planned",
    "created_by": 5,
    "created_by_username": "admin_user",
    "created_by_details": {
        "id": 5,
        "username": "admin_user",
        "email": "admin@example.com",
        "name": "John Admin"
    },
    "created_at": "2024-04-30T10:30:00Z",
    "updated_at": "2024-04-30T10:30:00Z",
    "attendance_records": [],
    "evidence_photo": null,
    "join_code": "123456",
    "qr_token": "abc123def456...",
    "qr_expires_at": "2024-05-07T10:30:00Z"
}
```

#### 5.2 List Endpoint (ViewSet)
```python
class ToolboxTalkViewSet(TenantScopedViewSet):
    """API endpoint for Toolbox Talks"""
    
    serializer_class = ToolboxTalkSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = ['status', 'date', 'created_by']
    search_fields = ['title', 'location', 'conducted_by']
    ordering_fields = ['date', 'title', 'created_at', 'status']
    ordering = ['-date']
    
    model = ToolboxTalk
    collaboration_enabled = True
    collaboration_domain = 'tbt'
    
    def get_queryset(self):
        """Filter toolbox talks based on user's project and permissions"""
        user = self.request.user
        if not user.is_authenticated:
            return ToolboxTalk.objects.none()
            
        # Superusers see all TBTs
        if user.is_superuser:
            return ToolboxTalk.objects.all()
        
        # Regular users: returns project-scoped results via TenantScopedViewSet
        return super().get_queryset()
```

**Query Examples:**
```
GET /api/tbt/list/                          # Get all TBTs for user's project
GET /api/tbt/list/?status=completed         # Filter by status
GET /api/tbt/list/?date=2024-04-30          # Filter by date
GET /api/tbt/list/?created_by=5             # Filter by creator
GET /api/tbt/list/?search=safety            # Search by title/location/conductor
GET /api/tbt/list/?ordering=-date           # Order by date (descending)
```

**Response (200 OK):**
```json
[
    {
        "id": 1,
        "title": "Daily Safety Briefing",
        "description": "Discussion on proper use of PPE",
        "date": "2024-04-30",
        "duration": 15,
        "duration_unit": "minutes",
        "location": "Site A",
        "conducted_by": "John Admin",
        "status": "completed",
        "created_by": 5,
        "created_by_username": "admin_user",
        "created_by_details": {...},
        "created_at": "2024-04-30T10:30:00Z",
        "updated_at": "2024-04-30T12:00:00Z",
        "attendance_records": [...],
        "evidence_photo": "https://...",
        "join_code": "123456",
        "qr_token": "abc123def456...",
        "qr_expires_at": "2024-05-07T10:30:00Z"
    }
]
```

#### 5.3 Attendance Submission Endpoint
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_attendance(request):
    """
    Submit attendance records for a toolbox talk with face recognition
    
    Request body:
    {
        "toolbox_talk_id": 1,
        "evidence_photo": "data:image/jpeg;base64,...",
        "attendance_records": [
            {
                "participant_type": "worker",
                "participant_id": 10,
                "attendance_photo": "data:image/jpeg;base64,..."
            },
            {
                "participant_type": "user",
                "participant_id": 5,
                "attendance_photo": "data:image/jpeg;base64,..."
            }
        ]
    }
    """
    ensure_tenant_context(request)
    enforce_collaboration_read_only(request, domain='tbt')
    
    toolbox_talk_id = request.data.get('toolbox_talk_id')
    attendance_records = request.data.get('attendance_records', [])
    evidence_photo = request.data.get('evidence_photo')
    
    # Face recognition processing
    from shared.training_face_recognition import compare_training_faces
    
    created_records = []
    failed_records = []
    face_recognition_results = []
    
    for record in attendance_records:
        try:
            participant_type = record.get('participant_type', 'worker')
            participant_id = record.get('participant_id') or record.get('worker_id')
            attendance_photo = record.get('attendance_photo', '')
            
            # Perform face recognition if photo provided
            face_match_result = {'matched': True, 'confidence': 1.0, 'message': 'No photo verification'}
            
            if attendance_photo and participant_id:
                face_match_result = compare_training_faces(
                    profile_photo_path, 
                    attendance_photo
                )
            
            # Create attendance record
            if participant_type == 'worker':
                worker = Worker.objects.get(id=participant_id)
                attendance = ToolboxTalkAttendance.objects.create(
                    toolbox_talk=toolbox_talk,
                    worker=worker,
                    status='present' if face_match_result['matched'] else 'absent',
                    match_score=face_match_result['confidence'],
                    attendance_photo=attendance_photo
                )
                created_records.append(attendance)
            
        except Exception as e:
            failed_records.append({'record': record, 'error': str(e)})
    
    # Update TBT status to completed
    toolbox_talk.status = 'completed'
    toolbox_talk.evidence_photo = evidence_photo
    toolbox_talk.save()
    
    return Response({
        'message': 'Attendance submitted successfully with face recognition',
        'records_created': len(created_records),
        'failed_records': failed_records,
        'face_recognition_results': face_recognition_results,
        'total_submitted': len(attendance_records),
        'success_rate': f"{(len(created_records)/len(attendance_records)*100):.1f}%"
    }, status=status.HTTP_201_CREATED)
```

#### 5.4 Trained Personnel Endpoint
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trained_personnel(request):
    """
    Get all induction-trained personnel for TBT attendance.
    
    Returns both workers and admin users who have completed induction training.
    
    Query for completed InductionAttendance records and separates:
    - Workers: participant_type='worker'
    - Users (admin users): participant_type='user'
    """
    from inductiontraining.models import InductionAttendance, InductionTraining
    from worker.models import Worker
    
    ensure_tenant_context(request)
    user_project = ensure_project(request)
    
    # Get completed inductions in current project
    project_inductions = InductionTraining.objects.filter(
        project=user_project,
        status='completed'
    )
    
    # Get attendance records from completed inductions
    trained_attendance = InductionAttendance.objects.filter(
        induction__in=project_inductions,
        status='present'
    ).select_related('induction').order_by('-induction__date', 'worker_name')
    
    # Separate workers and users
    worker_records = trained_attendance.filter(participant_type='worker')
    user_records = trained_attendance.filter(participant_type='user')
    
    # Extract unique IDs
    trained_worker_ids = list(worker_records.values_list('worker_id', flat=True).distinct())
    trained_user_ids = list(user_records.values_list('worker_id', flat=True).distinct())
    
    # Get worker details
    trained_workers = Worker.objects.filter(
        id__in=trained_worker_ids,
        project=user_project
    )
    
    # Get user details
    trained_users = User.objects.filter(
        id__in=trained_user_ids,
        project=user_project
    )
    
    return Response({
        'count': len(trained_workers) + len(trained_users),
        'workers': WorkerSerializer(trained_workers, many=True, context={'request': request}).data,
        'users': [...],
        'all_participants': [...],
        'workers_count': len(trained_workers),
        'users_count': len(trained_users),
        'message': f'Found {len(trained_workers) + len(trained_users)} trained personnel'
    })
```

#### 5.5 User Search Endpoints
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """Get list of admin users for 'conducted_by' dropdown"""
    ensure_tenant_context(request)
    user_project = ensure_project(request)
    
    users = User.objects.filter(user_type='adminuser', project=user_project)
    
    return Response([
        {
            'id': user.id,
            'username': user.username,
            'name': f"{user.name or ''} {user.surname or ''}".strip() or user.username,
            'email': user.email or ''
        }
        for user in users
    ])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_search(request):
    """Search for admin users with query parameter"""
    ensure_tenant_context(request)
    user_project = ensure_project(request)
    
    query = request.query_params.get('q', '')
    users_query = User.objects.filter(project=user_project, user_type='adminuser')
    
    if query:
        users_query = users_query.filter(
            models.Q(username__icontains=query) | 
            models.Q(email__icontains=query) |
            models.Q(name__icontains=query) |
            models.Q(surname__icontains=query)
        )[:10]
    
    return Response([
        {
            'id': user.id,
            'username': user.username,
            'name': f"{user.name or ''} {user.surname or ''}".strip() or user.username,
            'email': user.email or ''
        }
        for user in users_query
    ])
```

---

## 6. Tenant/Company Filtering

### ✅ Multi-tenant Isolation Implemented

#### Model Level
- Both `ToolboxTalk` and `ToolboxTalkAttendance` have `athens_tenant_id` field
- `ToolboxTalk` has `project` ForeignKey to filter by company project

#### View Level
- All endpoints use `TenantScopedViewSet` or call `ensure_tenant_context(request)`
- `ensure_project(request)` gets the user's project
- All queries filtered by `project=user_project`

#### Example Filtering
```python
# In list view
def get_queryset(self):
    user = self.request.user
    if user.is_superuser:
        return ToolboxTalk.objects.all()
    # TenantScopedViewSet automatically filters by project
    return super().get_queryset()

# In trained_personnel view
project_inductions = InductionTraining.objects.filter(
    project=user_project,
    status='completed'
)

# In create view
serializer.save(
    created_by=request.user, 
    project=ensure_project(request)  # ← Company/project filtering
)
```

---

## 7. Comparison: TBT vs InductionTraining vs JobTraining

| Aspect | TBT | InductionTraining | JobTraining |
|--------|-----|-------------------|------------|
| **Purpose** | Daily safety briefings (15-30 min) | Onboarding training | Role-specific training |
| **Duration** | Minutes/Hours (default 30 min) | Multiple days/weeks | Multiple days/weeks |
| **Model Name** | `ToolboxTalk` | `InductionTraining` | `JobTraining` |
| **Attendance Model** | `ToolboxTalkAttendance` | `InductionAttendance` | `JobTrainingAttendance` |
| **Attendance Tracking** | Face recognition enabled | Face recognition enabled | Face recognition enabled |
| **URL Prefix** | `/api/tbt/` | `/api/induction-training/` | `/api/job-training/` |
| **Separate Module** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Participant Types** | Workers + Users | Workers + Users | Workers + Users |
| **QR Code Support** | ✅ Yes (join_code, qr_token) | ✅ Yes | ✅ Yes |
| **Project Filtering** | ✅ Yes (project FK) | ✅ Yes (project FK) | ✅ Yes (project FK) |
| **Tenant Isolation** | ✅ Yes (athens_tenant_id) | ✅ Yes (athens_tenant_id) | ✅ Yes (athens_tenant_id) |
| **Evidence Photo** | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 8. Frontend Integration

### File: `frontend/src/pages/toolboxtalk/components/ToolboxTalkList.tsx`

```typescript
const fetchToolboxTalks = useCallback(async () => {
  setLoading(true);
  try {
    const endpoint = '/tbt/list/';
    const response = await api.get(endpoint);
    
    if (Array.isArray(response.data)) {
      const fetchedTBTs = response.data.map((tbt: any) => ({
        key: String(tbt.id),
        id: tbt.id,
        title: tbt.title,
        date: tbt.date,
        location: tbt.location,
        conducted_by: tbt.conducted_by,
        status: tbt.status,
        created_by: tbt.created_by,
        created_by_username: tbt.created_by_username,
        created_at: tbt.created_at,
        updated_at: tbt.updated_at
      }));
      setToolboxTalks(fetchedTBTs);
    }
  } catch (error) {
    message.error('Failed to load toolbox talks');
  } finally {
    setLoading(false);
  }
}, [message]);

useEffect(() => {
  fetchToolboxTalks();
}, [fetchToolboxTalks]);
```

---

## 9. Permission & Collaboration Features

### Creator-Based Permissions
```python
permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]

# Users can:
# - View all TBTs in their project
# - Edit/delete only their own TBTs
# - Project admins can edit/delete any TBT
```

### Collaboration Support
```python
class ToolboxTalkViewSet(TenantScopedViewSet):
    collaboration_enabled = True
    collaboration_domain = 'tbt'
    
    # Ensures collaboration read-only mode enforcement
    enforce_collaboration_read_only(request, domain='tbt')
```

---

## 10. Key Findings Summary

✅ **TBT is a separate module** from InductionTraining and JobTraining
✅ **Multi-tenant isolation implemented** via `athens_tenant_id` and `project` FK
✅ **Company/project filtering** enforced at view level
✅ **Face recognition** integrated in attendance submission
✅ **QR code support** with time-limited tokens
✅ **Creator-based permissions** - only creator or admin can edit
✅ **Collaboration support** enabled for team-based workflows
✅ **Proper separation of concerns** - distinct models, serializers, views, and endpoints

---

## 11. API Request/Response Examples

### Create TBT
```bash
curl -X POST http://localhost:8000/api/tbt/create/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily Safety Briefing",
    "date": "2024-04-30",
    "location": "Site A",
    "conducted_by": "John Admin",
    "duration": 15,
    "duration_unit": "minutes"
  }'
```

### List TBTs
```bash
curl -X GET http://localhost:8000/api/tbt/list/ \
  -H "Authorization: Bearer <token>"
```

### Submit Attendance with Face Recognition
```bash
curl -X POST http://localhost:8000/api/tbt/attendance/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toolbox_talk_id": 1,
    "evidence_photo": "data:image/jpeg;base64,...",
    "attendance_records": [
      {
        "participant_type": "worker",
        "participant_id": 10,
        "attendance_photo": "data:image/jpeg;base64,..."
      }
    ]
  }'
```

### Get Trained Personnel
```bash
curl -X GET http://localhost:8000/api/tbt/trained-personnel/ \
  -H "Authorization: Bearer <token>"
```

