# Project Role Implementation

## Overview
Implemented project-centric role management where each project has ONE client and ONE or MULTIPLE EPCs based on subscriber type.

## Business Rules

### Subscriber Role Logic
1. **Client as Subscriber**
   - Can add MULTIPLE EPCs to the project
   - Client pays for the subscription
   - EPCs are service providers

2. **EPC as Subscriber**
   - Can only have ONE client
   - EPC pays for the subscription
   - Client is the customer

## Database Changes

### Project Model Updates
```python
# New fields added to Project model
subscriber_role = CharField(choices=['client', 'epc'])  # Who is the subscriber
epc_company_ids = JSONField(default=list)  # Changed from single epc_company_id to list
```

### Migration
- **File**: `authentication/migrations/0010_add_project_subscriber_role.py`
- **Changes**:
  - Removed `epc_company_id` (single UUID)
  - Added `epc_company_ids` (JSON array)
  - Added `subscriber_role` (client/epc)

## API Changes

### Project Creation Endpoint
**POST** `/api/authentication/masteradmin/projects/`

**New Required Fields**:
```json
{
  "projectName": "Solar Plant Project",
  "projectCategory": "power_and_energy",
  "location": "Mumbai",
  "subscriber_role": "client",  // NEW: 'client' or 'epc'
  "client_company_id": "uuid-here",
  "epc_company_ids": ["uuid1", "uuid2"],  // NEW: Array instead of single ID
  "commencementDate": "2025-01-01",
  "deadlineDate": "2026-12-31"
}
```

### Validation Rules
1. **EPC Subscriber**: `epc_company_ids` must have exactly 1 entry (itself)
2. **Client Subscriber**: `epc_company_ids` must have at least 1 entry
3. Deadline must be after commencement date

## Frontend Changes

### Projects.tsx
**New UI Elements**:
- Subscriber Role dropdown in Create/Edit modals
  - Option 1: "Client (can add multiple EPCs)"
  - Option 2: "EPC (one client only)"

**Form State**:
```typescript
interface Project {
  subscriber_role?: string
  epc_company_ids?: string[]
}
```

## Admin Assignment Flow

### Current Behavior
When creating project admins via `/api/authentication/masteradmin/create-project-admin/`:
- Admin type is manually selected: `client`, `epc`, or `contractor`
- Admin is linked to the project
- Credentials are auto-generated

### Future Enhancement (Recommended)
Auto-populate admin type based on project's `subscriber_role`:
```python
# In ProjectAdminCreateSerializer.create()
project = Project.objects.get(id=validated_data['project_id'])

# Auto-determine available admin types
if project.subscriber_role == 'client':
    # Allow: client (1), epc (multiple), contractor (multiple)
    allowed_types = ['client', 'epc', 'contractor']
elif project.subscriber_role == 'epc':
    # Allow: epc (1), client (1), contractor (multiple)
    allowed_types = ['epc', 'client', 'contractor']
```

## Testing

### Test Project Creation
```bash
curl -X POST https://www.ai-athens.cloud/api/authentication/masteradmin/projects/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Test Solar Project",
    "projectCategory": "power_and_energy",
    "location": "Delhi",
    "subscriber_role": "client",
    "epc_company_ids": ["uuid1", "uuid2"],
    "commencementDate": "2025-02-01",
    "deadlineDate": "2026-12-31"
  }'
```

### Expected Response
```json
{
  "id": 1,
  "projectName": "Test Solar Project",
  "subscriber_role": "client",
  "epc_company_ids": ["uuid1", "uuid2"],
  ...
}
```

## Files Modified

### Backend
- `authentication/models.py` - Added subscriber_role, changed epc_company_id to epc_company_ids
- `authentication/masteradmin/serializers.py` - Updated serializers with validation
- `authentication/migrations/0010_add_project_subscriber_role.py` - Migration file

### Frontend
- `frontend/src/pages/masteradmin/Projects.tsx` - Added subscriber role dropdown

## Next Steps

1. **Admin Type Auto-Selection**: Update admin creation to auto-suggest admin types based on project subscriber role
2. **Company Selector**: Add multi-select dropdown for EPC companies when subscriber_role is 'client'
3. **Validation UI**: Show real-time validation (e.g., "Client subscriber must select at least 1 EPC")
4. **Project Dashboard**: Display subscriber role badge on project cards
5. **Admin Count Limits**: Enforce 1 client admin, 1 or multiple EPC admins based on subscriber role

## Status
✅ **Backend**: Complete - Model, serializers, validation, migration applied
✅ **Frontend**: Complete - UI updated with subscriber role selection
✅ **Migration**: Applied successfully
✅ **Backend**: Restarted (PID 1063909)
✅ **Frontend**: Built and deployed

**Ready for testing and further enhancements.**
