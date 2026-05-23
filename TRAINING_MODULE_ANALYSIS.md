# Training Module Analysis - Athens 2.0 ERP System

## Overview
The Athens 2.0 system features a comprehensive training management module with **two main training types**:
1. **Induction Training** - For new employee onboarding
2. **Job Training** - For job-specific skill training

---

## 1. BACKEND TRAINING VIEWS & API ENDPOINTS

### Induction Training API Endpoints

#### File: `backend/inductiontraining/views.py`

**Primary ViewSet:** `InductionTrainingViewSet` (TenantScopedViewSet)
- **Model:** `InductionTraining`
- **Collaboration:** Enabled (collaboration_domain: 'inductiontraining')
- **Permission:** `IsAuthenticated` + `IsCreatorOrReadOnlyWithStatusCheck`

**Endpoints:**

```
GET    /api/induction-training/api/          → List trainings (InductionTrainingListSerializer)
POST   /api/induction-training/api/          → Create training (InductionTrainingSerializer)
GET    /api/induction-training/api/{id}/     → Retrieve single training
PATCH  /api/induction-training/api/{id}/     → Update training
DELETE /api/induction-training/api/{id}/     → Delete training
GET    /api/induction-training/api/{id}/signatures/  → Get signature status
POST   /api/induction-training/api/{id}/signatures/  → Add/update signatures
```

**Additional Functions:**

```python
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def create_induction_training(request):
    """Handle both GET (list) and POST (create) for induction training"""
```

**Access Control:**
- Only "EPC Safety Department" users can access
- Check: `is_epc_safety_user(request.user)`
- Master/SuperAdmin can access all trainings
- Regular users see only their created trainings

**Filtering in get_queryset():**
```python
def get_queryset(self):
    if not self.is_epc_safety_user(self.request.user):
        return InductionTraining.objects.none()
    
    user = self.request.user
    if hasattr(user, 'admin_type') and user.admin_type in ['master', 'masteradmin']:
        return InductionTraining.objects.all()
    
    return super().get_queryset()  # TenantScopedViewSet filters by project
```

---

### Job Training API Endpoints

#### File: `backend/jobtraining/views.py`

**Primary ViewSet:** `JobTrainingViewSet` (TenantScopedViewSet)
- **Model:** `JobTraining`
- **Collaboration:** Enabled (collaboration_domain: 'jobtraining')
- **Permission:** `IsAuthenticated`

**Endpoints:**

```
GET    /api/job-training/                    → List trainings
POST   /api/job-training/create/             → Create training
GET    /api/job-training/{id}/               → Retrieve single training
PATCH  /api/job-training/{id}/               → Update training
DELETE /api/job-training/{id}/               → Delete training
GET    /api/job-training/users/list/         → Get admin users dropdown
GET    /api/job-training/users/search/       → Search admin users
GET    /api/job-training/trained-personnel/  → Get induction-trained personnel
GET    /api/job-training/deployed-workers/   → Alias for trained-personnel
```

**Create Endpoint:**
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_job_training(request):
    """Create a new job training"""
    ensure_tenant_context(request)
    enforce_collaboration_read_only(request, domain='jobtraining')
    serializer = JobTrainingSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user, project=ensure_project(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**Filtering in get_queryset():**
```python
def get_queryset(self):
    return super().get_queryset().order_by('-created_at')
    # TenantScopedViewSet handles project isolation
```

**Special Endpoints:**

- **users/list/** - Get dropdown of admin users for "conducted_by" field
- **users/search?q=query** - Search admin users by name/email
- **trained-personnel/** - Get all induction-trained personnel (workers + users) for job training attendance

---

## 2. TRAINING MODEL DEFINITIONS & SERIALIZERS

### Induction Training Model

#### File: `backend/inductiontraining/models.py`

```python
class InductionTraining(models.Model):
    # Basic Fields
    title = CharField(max_length=255)
    description = TextField(blank=True)
    date = DateField()
    start_time = TimeField(null=True, blank=True)
    end_time = TimeField(null=True, blank=True)
    duration = PositiveIntegerField(default=60)  # in minutes/hours
    duration_unit = CharField(choices=[('minutes', 'Minutes'), ('hours', 'Hours')], default='minutes')
    location = CharField(max_length=255, blank=True)
    conducted_by = CharField(max_length=255)
    
    # Status
    status = CharField(
        choices=[('planned', 'Planned'), ('completed', 'Completed'), ('cancelled', 'Cancelled')],
        default='planned'
    )
    
    # Attendance & QR
    evidence_photo = TextField(blank=True, null=True)  # Base64 encoded
    join_code = CharField(max_length=12, blank=True, null=True)
    qr_token = CharField(max_length=64, blank=True, null=True)
    qr_expires_at = DateTimeField(blank=True, null=True)  # 7 days from creation
    
    # ISO Compliance
    document_id = CharField(max_length=50, unique=True)  # Format: TRN-IND-{timestamp}
    revision_number = CharField(max_length=10, default='00')
    
    # Digital Signatures (Authorization Chain)
    trainer_signature = TextField(blank=True, null=True)
    trainer_user = ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='trainer_signatures')
    
    hr_signature = TextField(blank=True, null=True)
    hr_user = ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='hr_signatures')
    hr_name = CharField(max_length=255, blank=True)
    hr_date = DateField(null=True, blank=True)
    
    safety_signature = TextField(blank=True, null=True)
    safety_user = ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='safety_signatures')
    safety_name = CharField(max_length=255, blank=True)
    safety_date = DateField(null=True, blank=True)
    
    dept_head_signature = TextField(blank=True, null=True)  # Quality Officer
    dept_head_user = ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='quality_signatures')
    dept_head_name = CharField(max_length=255, blank=True)
    dept_head_date = DateField(null=True, blank=True)
    
    # Project Isolation
    project = ForeignKey('authentication.Project', on_delete=models.CASCADE, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=models.CASCADE, related_name='created_induction_trainings')
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Related Model:** `InductionAttendance`
```python
class InductionAttendance(models.Model):
    induction = ForeignKey(InductionTraining, on_delete=models.CASCADE)
    worker_id = IntegerField()  # Stored as -user_id for users, positive for workers
    worker_name = CharField(max_length=255)
    worker_photo = TextField(blank=True)
    attendance_photo = TextField(blank=True)
    participant_type = CharField(choices=[('worker', 'Worker'), ('user', 'User')], default='worker')
    match_score = FloatField(default=0)
    status = CharField(choices=[('present', 'Present'), ('absent', 'Absent')])
    created_at = DateTimeField(auto_now_add=True)
    athens_tenant_id = CharField(max_length=50, blank=True, null=True)
```

### Job Training Model

#### File: `backend/jobtraining/models.py`

```python
class JobTraining(models.Model):
    # Basic Fields
    title = CharField(max_length=255)
    description = TextField(blank=True, null=True)
    date = DateField()
    location = CharField(max_length=255, blank=True, null=True)
    conducted_by = CharField(max_length=255)
    
    # Status
    status = CharField(
        choices=[('planned', 'Planned'), ('completed', 'Completed'), ('cancelled', 'Cancelled')],
        default='planned'
    )
    
    # Attendance & QR
    join_code = CharField(max_length=12, blank=True, null=True)  # 6-digit random number
    qr_token = CharField(max_length=64, blank=True, null=True)   # UUID
    qr_expires_at = DateTimeField(blank=True, null=True)         # 7 days from creation
    
    # Project Isolation
    project = ForeignKey('authentication.Project', on_delete=models.CASCADE, null=True, blank=True)
    created_by = ForeignKey(User, on_delete=models.CASCADE, related_name='created_job_trainings')
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Related Model:** `JobTrainingAttendance`
```python
class JobTrainingAttendance(models.Model):
    job_training = ForeignKey(JobTraining, on_delete=models.CASCADE, related_name='attendances')
    worker = ForeignKey(Worker, on_delete=models.CASCADE, null=True, blank=True)
    user_id = IntegerField(null=True, blank=True)
    user_name = CharField(max_length=255, blank=True)
    participant_type = CharField(choices=[('worker', 'Worker'), ('user', 'User')], default='worker')
    status = CharField(choices=[('present', 'Present'), ('absent', 'Absent')])
    attendance_photo = TextField(blank=True)
    match_score = FloatField(default=0)
    timestamp = DateTimeField(auto_now_add=True)
```

---

### Serializers

#### Induction Training Serializers

**File:** `backend/inductiontraining/serializers.py`

**InductionTrainingSerializer** (Detail View)
```python
class InductionTrainingSerializer(serializers.ModelSerializer):
    attendances = InductionAttendanceSerializer(many=True, read_only=True)
    is_signatures_complete = serializers.ReadOnlyField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = InductionTraining
        fields = [
            'id', 'title', 'description', 'date', 'start_time', 'end_time', 
            'duration', 'duration_unit', 'location', 'conducted_by', 'status', 
            'evidence_photo', 'document_id', 'revision_number',
            'join_code', 'qr_token', 'qr_expires_at',
            'trainer_signature', 'hr_signature', 'hr_name', 'hr_date',
            'safety_signature', 'safety_name', 'safety_date',
            'dept_head_signature', 'dept_head_name', 'dept_head_date',
            'created_by', 'created_by_username', 'created_at', 'updated_at', 
            'attendances', 'is_signatures_complete'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'created_by_username', 'document_id', 'is_signatures_complete']
```

**InductionTrainingListSerializer** (List View)
```python
class InductionTrainingListSerializer(serializers.ModelSerializer):
    # Same fields as detail but optimized for list display
    # Includes signature fields for print preview
    # Signature paths converted to full URLs
```

#### Job Training Serializers

**File:** `backend/jobtraining/serializers.py`

**JobTrainingSerializer**
```python
class JobTrainingSerializer(serializers.ModelSerializer):
    attendances = JobTrainingAttendanceSerializer(many=True, read_only=True)
    
    class Meta:
        model = JobTraining
        fields = [
            'id', 'title', 'description', 'date', 'location', 
            'conducted_by', 'status', 'join_code', 'qr_token', 'qr_expires_at',
            'created_by', 'created_at', 'updated_at', 'attendances'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True, 'allow_null': True},
            'location': {'required': False, 'allow_blank': True, 'allow_null': True},
        }
```

**JobTrainingListSerializer**
```python
class JobTrainingListSerializer(serializers.ModelSerializer):
    # Optimized for list display
```

---

## 3. FRONTEND TRAINING COMPONENTS

### Directory Structure
```
frontend/src/pages/training/
├── TrainingPage.tsx           # Main page container
├── TrainingLanding.tsx        # Landing/welcome page
├── components/
│   ├── TrainingForm.tsx       # Create/Edit form
│   └── TrainingList.tsx       # List with filters
```

### TrainingForm Component

**File:** `frontend/src/pages/training/components/TrainingForm.tsx`

```typescript
interface TrainingFormProps {
  trainingId?: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TrainingForm: React.FC<TrainingFormProps> = ({ trainingId, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [trainingType, setTrainingType] = useState('induction');

  const handleSubmit = async (values: any) => {
    const payload = {
      title: values.title,
      conducted_by: values.trainer,
      location: values.location,
      date: values.training_date?.format('YYYY-MM-DD'),
      status: 'upcoming',
      description: values.description,
      ...values,
    };
    
    if (trainingId) {
      await apiClient.patch(`/api/tbt/update/${trainingId}/`, payload);
    } else {
      await apiClient.post('/api/tbt/create/', payload);
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      {/* Training Type: Radio Group (Induction / Job) */}
      <Form.Item name="training_type" label="Training Type">
        <Radio.Group onChange={(e) => setTrainingType(e.target.value)}>
          <Radio.Button value="induction">Induction Training</Radio.Button>
          <Radio.Button value="job">Job Training</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {/* Common Fields */}
      <Form.Item name="title" label="Training Title" rules={[{ required: true }]}>
        <Input placeholder="Enter training title" />
      </Form.Item>

      <Form.Item name="training_date" label="Training Date" rules={[{ required: true }]}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="trainer" label="Trainer" rules={[{ required: true }]}>
        <Input placeholder="Enter trainer name" />
      </Form.Item>

      <Form.Item name="location" label="Location" rules={[{ required: true }]}>
        <Input placeholder="Enter location" />
      </Form.Item>

      {/* Job Training Specific */}
      {trainingType === 'job' && (
        <Form.Item name="job_role" label="Job Role" rules={[{ required: true }]}>
          <Input placeholder="Enter job role" />
        </Form.Item>
      )}

      {/* Description */}
      <Form.Item name="description" label="Description">
        <TextArea rows={4} placeholder="Enter training description" />
      </Form.Item>
    </Form>
  );
};
```

**Field Mapping:**
- Frontend → Backend
- `title` → `title`
- `training_date` → `date` (YYYY-MM-DD)
- `trainer` → `conducted_by`
- `location` → `location`
- `training_type` → For routing (induction vs job endpoint)
- `description` → `description`

---

### TrainingList Component

**File:** `frontend/src/pages/training/components/TrainingList.tsx`

```typescript
interface TrainingListProps {
  onView?: (training: any) => void;
  onEdit?: (training: any) => void;
  refreshKey?: number;
}

const TrainingList: React.FC<TrainingListProps> = ({ onView, onEdit, refreshKey }) => {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const fetchTrainings = () => {
    apiClient.get('/api/tbt/list/')
      .then(res => {
        const data = res.data?.results ?? res.data;
        setTrainings(Array.isArray(data) ? data : []);
      })
      .catch(() => setTrainings([]));
  };

  const columns = [
    { title: 'Training ID', dataIndex: 'id', key: 'id' },
    { title: 'Type', dataIndex: 'training_type', key: 'training_type', render: (type) => <Tag>{type}</Tag> },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Date', dataIndex: 'training_date', key: 'training_date' },
    { title: 'Trainer', dataIndex: 'trainer', key: 'trainer' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Attendees', dataIndex: 'attendees', key: 'attendees' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => <Tag color={statusColor}>{status}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Button type="link" onClick={() => onView?.(record)}>View</Button>
        <Button type="link" icon={<EditOutlined />} onClick={() => onEdit?.(record)}>Edit</Button>
      </Space>
    )}
  ];
};
```

**Filtering Logic:**
```typescript
const filtered = trainings.filter(t => {
  // Search by title, trainer, or location
  const matchSearch = !searchText ||
    t.title?.toLowerCase().includes(searchText.toLowerCase()) ||
    t.conducted_by?.toLowerCase().includes(searchText.toLowerCase()) ||
    t.location?.toLowerCase().includes(searchText.toLowerCase());
  
  // Filter by type or status
  const matchType = !typeFilter || t.training_type === typeFilter || t.status === typeFilter;
  
  return matchSearch && matchType;
});
```

---

## 4. CURRENT FILTERING LOGIC

### Backend Filtering

#### Induction Training Filtering

**Primary Filters in `get_queryset()`:**

1. **User Type Filter:**
   - Only "EPC Safety Department" users can access
   - Master/SuperAdmin bypass this restriction

2. **Project Isolation:**
   - TenantScopedViewSet base class handles filtering by user.project
   - `super().get_queryset()` applies project filtering

3. **Ordering:**
   - No explicit ordering in InductionTrainingViewSet
   - Default creation order

**Example Query:**
```python
# For regular users
InductionTraining.objects.filter(project=user.project, created_by=user)

# For EPC Safety users
InductionTraining.objects.filter(project=user.project)

# For Master/SuperAdmin
InductionTraining.objects.all()
```

#### Job Training Filtering

**Primary Filters in `get_queryset()`:**

1. **Project Isolation:**
   - TenantScopedViewSet filters by user.project

2. **Ordering:**
   ```python
   return super().get_queryset().order_by('-created_at')
   ```
   - Most recent first

**Special Filtering - `trained_personnel` endpoint:**

```python
# Get completed inductions in current project
project_inductions = InductionTraining.objects.filter(
    project=request.user.project,
    status='completed'
)

# Get attendance records
trained_attendance = InductionAttendance.objects.filter(
    induction__in=project_inductions,
    status='present'
).select_related('induction').order_by('-induction__date', 'worker_name')

# Separate workers and users
worker_records = trained_attendance.filter(participant_type='worker', worker_id__gt=0)
user_records = trained_attendance.filter(participant_type='user', worker_id__lt=0)
```

### Frontend Filtering

#### TrainingList Filtering

**Client-Side Filters:**

1. **Search Text Filter:**
   ```typescript
   t.title?.toLowerCase().includes(searchText.toLowerCase()) ||
   t.conducted_by?.toLowerCase().includes(searchText.toLowerCase()) ||
   t.location?.toLowerCase().includes(searchText.toLowerCase())
   ```

2. **Type Filter (Dropdown):**
   ```typescript
   t.training_type === typeFilter || t.status === typeFilter
   ```
   - Options: 'induction', 'job'
   - Also matches status values

**No Backend Filtering Parameters Used:**
- Query parameters are not sent to backend
- All filtering happens client-side after fetching all records
- Could be optimized by adding backend filter support

---

## 5. REQUEST/RESPONSE EXAMPLES

### Create Induction Training

**Request (POST /api/induction-training/api/):**
```json
{
  "title": "Safety Orientation",
  "description": "New employee safety induction",
  "date": "2026-04-30",
  "start_time": "09:00:00",
  "end_time": "11:00:00",
  "duration": 120,
  "duration_unit": "minutes",
  "location": "Training Room A",
  "conducted_by": "John Smith",
  "status": "planned"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "title": "Safety Orientation",
  "description": "New employee safety induction",
  "date": "2026-04-30",
  "start_time": "09:00:00",
  "end_time": "11:00:00",
  "duration": 120,
  "duration_unit": "minutes",
  "location": "Training Room A",
  "conducted_by": "John Smith",
  "status": "planned",
  "evidence_photo": null,
  "document_id": "TRN-IND-20260430090000",
  "revision_number": "00",
  "join_code": "123456",
  "qr_token": "abc123def456...",
  "qr_expires_at": "2026-05-07T09:00:00Z",
  "trainer_signature": null,
  "hr_signature": null,
  "hr_name": "",
  "hr_date": null,
  "safety_signature": null,
  "safety_name": "",
  "safety_date": null,
  "dept_head_signature": null,
  "dept_head_name": "",
  "dept_head_date": null,
  "created_by": 1,
  "created_by_username": "admin",
  "created_at": "2026-04-30T10:15:00Z",
  "updated_at": "2026-04-30T10:15:00Z",
  "attendances": [],
  "is_signatures_complete": false,
  "signature_summary": {
    "trainer": false,
    "hr": false,
    "safety": false,
    "dept_head": false,
    "complete": false
  }
}
```

---

### Create Job Training

**Request (POST /api/job-training/create/):**
```json
{
  "title": "Advanced Welding",
  "description": "Certified welding course",
  "date": "2026-05-01",
  "location": "Workshop B",
  "conducted_by": "Jane Doe",
  "status": "planned"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "title": "Advanced Welding",
  "description": "Certified welding course",
  "date": "2026-05-01",
  "location": "Workshop B",
  "conducted_by": "Jane Doe",
  "status": "planned",
  "join_code": "654321",
  "qr_token": "xyz789uvw123...",
  "qr_expires_at": "2026-05-08T00:00:00Z",
  "created_by": 2,
  "created_at": "2026-04-30T11:20:00Z",
  "updated_at": "2026-04-30T11:20:00Z",
  "attendances": []
}
```

---

### Get Trained Personnel (for Job Training)

**Request (GET /api/job-training/trained-personnel/):**
```
No parameters required - filters by user's project and completed inductions
```

**Response:**
```json
{
  "count": 15,
  "workers": [
    {
      "id": 101,
      "name": "Ahmed",
      "surname": "Hassan",
      "participant_type": "worker",
      "participant_id": 101,
      "photo": "http://api.local/media/workers/101.jpg"
    },
    {
      "id": 1,
      "username": "john_admin",
      "name": "John",
      "surname": "Smith",
      "participant_type": "user",
      "participant_id": 1,
      "photo": "http://api.local/media/users/1_photo.jpg"
    }
  ],
  "users": [...],
  "all_participants": [...]
}
```

---

## 6. KEY FEATURES & ARCHITECTURE

### Security & Access Control
- **Project Isolation:** All training data scoped to user's project
- **Role-Based Access:** Induction training restricted to EPC Safety Department
- **Tenant Isolation:** Multi-tenant support via `athens_tenant_id`
- **Collaboration Support:** Opt-in collaboration with domain-based access control

### Training Code System
- **Join Code:** 6-digit random number for attendance check-in
- **QR Token:** UUID hex string for QR code generation
- **QR Expiry:** 7-day validity period from creation

### ISO Compliance Features (Induction Training)
- **Document ID:** Auto-generated format `TRN-IND-{timestamp}`
- **Revision Tracking:** Revision number field
- **Digital Signatures:** Multi-stage authorization chain
  - Trainer signature
  - HR representative signature
  - Safety officer signature
  - Quality officer (dept head) signature

### Attendance Tracking
- **Induction:** Records worker attendance with facial recognition score
- **Job Training:** Tracks both workers and admin users
- **Participant Types:** 'worker' vs 'user' distinction
- **Status:** 'present' or 'absent'
- **Match Score:** Facial recognition confidence (0.0 - 1.0)

### Data Relationships
```
InductionTraining
  ├─ attendances: InductionAttendance (one-to-many)
  ├─ created_by: User
  ├─ project: Project
  └─ signatures: Related Users (trainer_user, hr_user, safety_user, dept_head_user)

JobTraining
  ├─ attendances: JobTrainingAttendance (one-to-many)
  ├─ created_by: User
  └─ project: Project
```

---

## 7. INTEGRATION POINTS

### With Attendance Module
- `attendance/services.py` references both training types
- Training attendance is recorded via `InductionAttendance` and `JobTrainingAttendance`
- Used for tracking compliance and access control

### With Worker Module
- Job training uses `Worker` model for personnel
- Induction attendance can link to workers or users

### With Authentication Module
- Project isolation via `authentication.Project`
- Tenant scoping via `athens_tenant_id`
- User type validation (admin_type, user_type)

### With AI Bot Module
- `ai_bot/signals.py` creates embeddings for training data
- `upsert_induction_training()` and `upsert_job_training()` handlers

---

## 8. CURRENT API ROUTING

From `backend/athens2/urls.py`:

```python
path('api/induction-training/', include('inductiontraining.urls')),
path('api/job-training/', include('jobtraining.urls')),
```

This maps to:
- Induction Training: `/api/induction-training/api/...`
- Job Training: `/api/job-training/...`

---

## 9. POTENTIAL IMPROVEMENTS

1. **Backend Filtering:**
   - Add query parameter support for filtering (status, date range, created_by)
   - Implement pagination for large datasets
   - Add search functionality on backend side

2. **Performance:**
   - Add database indexes on frequently filtered fields (status, date, project_id)
   - Implement caching for trained_personnel endpoint
   - Use select_related/prefetch_related for optimized queries

3. **Frontend:**
   - Migrate from client-side filtering to backend filtering
   - Add date range picker for training date filtering
   - Implement pagination in TrainingList

4. **Features:**
   - Add bulk operations (mark multiple trainings as complete)
   - Implement training templates
   - Add compliance reports/analytics
   - Email notifications for pending signatures

5. **Data Validation:**
   - Add validation that start_time < end_time
   - Ensure duration field matches actual time span
   - Validate QR token uniqueness across all trainings

---

## Summary Table

| Aspect | Induction Training | Job Training |
|--------|-------------------|--------------|
| **Endpoint Base** | `/api/induction-training/` | `/api/job-training/` |
| **Create Method** | POST or GET/POST function | POST to `/create/` |
| **Access Control** | EPC Safety Department only | Any authenticated user |
| **Model Fields** | 35+ (includes signatures) | 10+ fields |
| **Attendance Tracking** | Via InductionAttendance | Via JobTrainingAttendance |
| **QR System** | Yes (7-day expiry) | Yes (7-day expiry) |
| **Digital Signatures** | Yes (4 signatories) | No |
| **ISO Compliance** | Yes (document_id, revision) | No |
| **Trained Personnel Query** | N/A | Via `/trained-personnel/` |
| **Project Isolation** | Yes | Yes |

