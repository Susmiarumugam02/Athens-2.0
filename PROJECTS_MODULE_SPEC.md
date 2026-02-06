# Projects Module - Specification (Pre-PTW)

## 🎯 Objective

Build **minimum viable Projects module** to enable:
- Master admins to create/manage projects
- Company users to see assigned projects
- Project-scoped permissions for future modules (PTW, Incidents, Training)

---

## 📋 Requirements

### Backend (Django)

#### Models
```python
# control_plane/models.py

class Project(models.Model):
    tenant = ForeignKey(Tenant)
    name = CharField(max_length=200)
    code = CharField(max_length=50, unique=True)  # e.g., "PROJ-001"
    description = TextField(blank=True)
    location = CharField(max_length=200, blank=True)
    status = CharField(choices=['active', 'inactive', 'completed'])
    start_date = DateField()
    end_date = DateField(null=True, blank=True)
    created_by = ForeignKey(User)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

class ProjectMember(models.Model):
    project = ForeignKey(Project)
    user = ForeignKey(User)
    role = CharField(choices=['admin', 'member', 'viewer'])
    assigned_at = DateTimeField(auto_now_add=True)
    assigned_by = ForeignKey(User, related_name='assigned_members')
```

#### Endpoints
```
# Master Admin (tenant-scoped)
GET    /api/projects/                    # List tenant projects
POST   /api/projects/                    # Create project
GET    /api/projects/{id}/               # Get project details
PATCH  /api/projects/{id}/               # Update project
DELETE /api/projects/{id}/               # Delete project
POST   /api/projects/{id}/activate/      # Activate project
POST   /api/projects/{id}/deactivate/    # Deactivate project

# Project Members
GET    /api/projects/{id}/members/       # List project members
POST   /api/projects/{id}/members/       # Add member
DELETE /api/projects/{id}/members/{uid}/ # Remove member

# Company User (assigned projects only)
GET    /api/my-projects/                 # List my assigned projects
GET    /api/my-projects/{id}/            # Get project details
```

#### Permissions
- `IsMasterAdmin` - Full project CRUD
- `IsProjectMember` - Read-only access to assigned projects
- `IsProjectAdmin` - Manage project members

#### Serializers
```python
class ProjectSerializer(ModelSerializer):
    tenant_name = CharField(source='tenant.name', read_only=True)
    created_by_email = CharField(source='created_by.email', read_only=True)
    members_count = SerializerMethodField()
    
class ProjectMemberSerializer(ModelSerializer):
    user_email = CharField(source='user.email', read_only=True)
    assigned_by_email = CharField(source='assigned_by.email', read_only=True)
```

---

### Frontend (React + TypeScript)

#### Service Layer
```typescript
// src/services/projectService.ts

export interface Project {
  id: number
  tenant: number
  tenant_name?: string
  name: string
  code: string
  description: string
  location: string
  status: 'active' | 'inactive' | 'completed'
  start_date: string
  end_date?: string
  created_by: number
  created_by_email?: string
  members_count?: number
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: number
  project: number
  user: number
  user_email: string
  role: 'admin' | 'member' | 'viewer'
  assigned_at: string
  assigned_by: number
  assigned_by_email: string
}

export const projectService = {
  // Master Admin
  getAll: () => apiClient.get<Project[]>('/api/projects/'),
  getById: (id: number) => apiClient.get<Project>(`/api/projects/${id}/`),
  create: (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => 
    apiClient.post<Project>('/api/projects/', data),
  update: (id: number, data: Partial<Project>) => 
    apiClient.patch<Project>(`/api/projects/${id}/`, data),
  delete: (id: number) => apiClient.delete(`/api/projects/${id}/`),
  activate: (id: number) => apiClient.post(`/api/projects/${id}/activate/`),
  deactivate: (id: number) => apiClient.post(`/api/projects/${id}/deactivate/`),
  
  // Members
  getMembers: (projectId: number) => 
    apiClient.get<ProjectMember[]>(`/api/projects/${projectId}/members/`),
  addMember: (projectId: number, data: { user_id: number; role: string }) => 
    apiClient.post(`/api/projects/${projectId}/members/`, data),
  removeMember: (projectId: number, userId: number) => 
    apiClient.delete(`/api/projects/${projectId}/members/${userId}/`),
  
  // Company User
  getMyProjects: () => apiClient.get<Project[]>('/api/my-projects/'),
  getMyProject: (id: number) => apiClient.get<Project>(`/api/my-projects/${id}/`),
}
```

#### Pages

**Master Admin:**
1. `/master-admin/projects` - Projects list + create
2. `/master-admin/projects/{id}` - Project details + members

**Company User:**
1. `/app/projects` - My assigned projects
2. `/app/projects/{id}` - Project details (read-only)

#### Components
```
src/pages/master-admin/
├── Projects.tsx              # List + Create
└── ProjectDetails.tsx        # Details + Members

src/pages/company/
├── MyProjects.tsx            # Assigned projects list
└── ProjectView.tsx           # Project details (read-only)

src/components/projects/
├── ProjectCard.tsx           # Project card component
├── ProjectForm.tsx           # Create/Edit form
├── MembersList.tsx           # Members table
└── AddMemberModal.tsx        # Add member modal
```

---

## 🎨 UI Mockups

### Master Admin - Projects List
```
┌─────────────────────────────────────────────────────┐
│ Projects                                    [+ New] │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Name      │ Code     │ Status  │ Members │ ... │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Site A    │ PROJ-001 │ Active  │ 5       │ ... │ │
│ │ Site B    │ PROJ-002 │ Active  │ 3       │ ... │ │
│ │ Site C    │ PROJ-003 │ Inactive│ 0       │ ... │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Master Admin - Project Details
```
┌─────────────────────────────────────────────────────┐
│ ← Back to Projects                                  │
├─────────────────────────────────────────────────────┤
│ Site A Construction (PROJ-001)          [Edit] [⋮] │
│                                                     │
│ Status: ● Active                                    │
│ Location: Mumbai, India                             │
│ Duration: Jan 1, 2025 - Dec 31, 2025              │
│                                                     │
│ Description:                                        │
│ Construction of residential complex...              │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Project Members                    [+ Add]      │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ Email              │ Role   │ Assigned │ [×]   │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ admin@site.com     │ Admin  │ Jan 1    │ [×]   │ │
│ │ user@site.com      │ Member │ Jan 2    │ [×]   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Company User - My Projects
```
┌─────────────────────────────────────────────────────┐
│ My Projects                                         │
├─────────────────────────────────────────────────────┤
│ ┌───────────────────┐  ┌───────────────────┐       │
│ │ Site A            │  │ Site B            │       │
│ │ PROJ-001          │  │ PROJ-002          │       │
│ │ ● Active          │  │ ● Active          │       │
│ │ Role: Member      │  │ Role: Admin       │       │
│ │ [View Details]    │  │ [View Details]    │       │
│ └───────────────────┘  └───────────────────┘       │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 Security & Permissions

### Master Admin
- Can create/edit/delete projects in their tenant
- Can add/remove members
- Can activate/deactivate projects
- Cannot access other tenants' projects

### Company User
- Can only see assigned projects
- Read-only access
- Cannot create/edit/delete projects
- Cannot manage members

### Audit Logging
- Project created
- Project updated
- Project activated/deactivated
- Member added
- Member removed

---

## 📊 Database Schema

```sql
-- Projects table
CREATE TABLE control_plane_project (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES control_plane_tenant(id),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    location VARCHAR(200),
    status VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    created_by_id INTEGER REFERENCES authentication_user(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Project members table
CREATE TABLE control_plane_projectmember (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES control_plane_project(id),
    user_id INTEGER REFERENCES authentication_user(id),
    role VARCHAR(20) NOT NULL,
    assigned_at TIMESTAMP NOT NULL,
    assigned_by_id INTEGER REFERENCES authentication_user(id),
    UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX idx_project_tenant ON control_plane_project(tenant_id);
CREATE INDEX idx_project_status ON control_plane_project(status);
CREATE INDEX idx_projectmember_project ON control_plane_projectmember(project_id);
CREATE INDEX idx_projectmember_user ON control_plane_projectmember(user_id);
```

---

## 🧪 Testing Checklist

### Backend
- [ ] Create project (master admin)
- [ ] List projects (tenant-scoped)
- [ ] Update project
- [ ] Delete project
- [ ] Activate/Deactivate project
- [ ] Add member to project
- [ ] Remove member from project
- [ ] List project members
- [ ] Company user can see assigned projects only
- [ ] Audit logs created for all actions

### Frontend
- [ ] Master admin can create project
- [ ] Project form validation works
- [ ] Projects list displays correctly
- [ ] Project details page loads
- [ ] Can add members to project
- [ ] Can remove members from project
- [ ] Company user sees only assigned projects
- [ ] Status badges display correctly
- [ ] Loading states work
- [ ] Error handling works

---

## 🚀 Implementation Order

1. **Backend Models** (30 min)
   - Create Project model
   - Create ProjectMember model
   - Run migrations

2. **Backend Serializers** (20 min)
   - ProjectSerializer
   - ProjectMemberSerializer

3. **Backend Views** (40 min)
   - ProjectViewSet (master admin)
   - MyProjectsViewSet (company user)
   - Member management endpoints

4. **Backend Permissions** (20 min)
   - IsProjectMember permission
   - IsProjectAdmin permission

5. **Frontend Service** (15 min)
   - projectService.ts with all methods

6. **Frontend Pages - Master Admin** (60 min)
   - Projects list + create
   - Project details + members

7. **Frontend Pages - Company User** (30 min)
   - My projects list
   - Project view (read-only)

8. **Testing** (30 min)
   - Backend tests
   - Frontend smoke tests

**Total Estimated Time:** ~4 hours

---

## 📝 Notes

### Why Projects Before PTW?
- PTW permits are project-scoped
- Incidents are project-scoped
- Training is project-scoped
- Need project context for all business modules

### Minimum Viable
- No project templates
- No project phases/milestones
- No project documents (yet)
- No project budget/cost tracking
- Just: name, code, location, dates, members

### Future Enhancements
- Project templates
- Project phases
- Document management
- Budget tracking
- Gantt charts
- Project dashboard

---

**Status:** 📋 Specification Ready | ⏳ Awaiting Implementation

**When you say "start projects module"**, I'll implement this entire specification in one shot.
