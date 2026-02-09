# Athens Project - Complete Module Catalog for MasterAdmin

## 📋 Overview

Complete list of all modules available to **MasterAdmin** users in the Athens project (`/var/www/athens`).

**Total Modules:** 29 modules across 9 categories

## 🗂️ Module Categories & Modules

### 1. Dashboard (2 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Main Dashboard | `main_dashboard` | `/dashboard` | Main system dashboard |
| Analytics Dashboard | `analytics_dashboard` | `/analytics` | Analytics and reporting dashboard |

### 2. Safety Management (5 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Safety Observation | `safety_observation` | `/safety-observation` | Safety observation reports |
| Incident Management | `incident_management` | `/incidents` | Incident reporting and management |
| Permit to Work | `ptw` | `/ptw` | Work permit management |
| Inspection Management | `inspection` | `/inspections` | Safety inspections |
| Toolbox Talk | `toolbox_talk` | `/toolbox-talk` | Daily safety talks |

### 3. Training & Development (3 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Induction Training | `induction_training` | `/induction-training` | New employee induction |
| Job Training | `job_training` | `/job-training` | Job-specific training |
| Training Records | `training_records` | `/training-records` | Training history and certificates |

### 4. Workforce Management (2 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Worker Management | `worker_management` | `/workers` | Worker profiles and management |
| Manpower Management | `manpower_management` | `/manpower` | Manpower planning and allocation |

### 5. Communication (3 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Chatbox | `chatbox` | `/chat` | Team communication |
| Minutes of Meeting | `mom` | `/mom` | Meeting documentation |
| Voice Translator | `voice_translator` | `/voice-translator` | Multi-language translation |

### 6. Quality Management System (3 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Quality Standards | `quality_standards` | `/quality/standards` | Quality standards and procedures |
| Quality Audits | `quality_audits` | `/quality/audits` | Quality audit management |
| Non-Conformance Reports | `ncr` | `/quality/ncr` | Non-conformance tracking |

### 7. Environment Management (3 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Environmental Policies | `env_policies` | `/environment/policies` | Environmental policies and procedures |
| Environmental Monitoring | `env_monitoring` | `/environment/monitoring` | Environmental data monitoring |
| Sustainability Reports | `sustainability_reports` | `/environment/reports` | ESG reporting and analytics |

### 8. System Administration (3 modules) 🔒
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| User Management | `user_management` | `/admin/users` | User account management |
| Permission Control | `permission_control` | `/admin/permissions` | Access control and permissions |
| System Settings | `system_settings` | `/admin/settings` | System configuration |

**Note:** System Administration modules require `admin_type in ['master', 'masteradmin']`

### 9. Reports & Analytics (3 modules)
| Module | Key | Path | Description |
|--------|-----|------|-------------|
| Safety Reports | `safety_reports` | `/reports/safety` | Safety analytics and reports |
| Training Reports | `training_reports` | `/reports/training` | Training progress reports |
| Compliance Reports | `compliance_reports` | `/reports/compliance` | Regulatory compliance reports |

## 🔑 MasterAdmin Access Logic

```python
# From menu_views.py
if category.key in ['system_administration', 'admin']:
    # Only allow access for project admins and master admins
    user_type = getattr(user, 'user_type', None)
    admin_type = getattr(user, 'admin_type', None)
    
    # Allow access for:
    # 1. Project admins (created by master admin)
    # 2. Master admins
    if not (user_type == 'projectadmin' or admin_type in ['master', 'masteradmin']):
        # Block access
        continue
```

## 📊 Backend Apps Structure

```
/var/www/athens/app/backend/
├── ptw/                    # Permit to Work
├── incidentmanagement/     # Incident Management
├── safetyobservation/      # Safety Observation
├── quality/                # Quality Management
├── environment/            # Environment Management
├── inductiontraining/      # Induction Training
├── jobtraining/            # Job Training
├── tbt/                    # Toolbox Talk
├── inspection/             # Inspection
├── manpower/               # Manpower
├── worker/                 # Worker Management
├── attendance/             # Attendance (additional)
├── mom/                    # Minutes of Meeting
├── permissions/            # Permissions
├── chatbox/                # Chatbox
├── voice_translator/       # Voice Translator
├── ai_bot/                 # AI Bot (additional)
└── control_plane/          # Control Plane
```

## 🎯 Priority Modules for Athens 2.0 Clone

### Phase 1: Core Safety (High Priority)
1. ✅ **Permit to Work (PTW)** - Critical safety module
2. ✅ **Incident Management** - Essential for safety tracking
3. ✅ **Safety Observation** - Proactive safety monitoring
4. ✅ **Inspection** - Regular safety checks
5. ✅ **Toolbox Talk (TBT)** - Daily safety briefings

### Phase 2: Training & Workforce (Medium Priority)
6. ✅ **Induction Training** - New employee onboarding
7. ✅ **Job Training** - Skill development
8. ✅ **Worker Management** - Employee profiles
9. ✅ **Manpower** - Resource planning
10. ✅ **Attendance** - Time tracking

### Phase 3: Communication & Quality (Medium Priority)
11. ✅ **Minutes of Meeting (MOM)** - Documentation
12. ✅ **Quality Standards** - QMS foundation
13. ✅ **Quality Audits** - Compliance checks
14. ✅ **Chatbox** - Team communication

### Phase 4: Environment & Admin (Lower Priority)
15. ✅ **Environment Monitoring** - ESG tracking
16. ✅ **Permission Control** - Access management
17. ✅ **User Management** - Admin tools

## 📋 Implementation Checklist for Athens 2.0

### Backend Setup
- [ ] Create Django apps for each module
- [ ] Define models (forms, records, approvals)
- [ ] Create serializers
- [ ] Implement ViewSets with permissions
- [ ] Add URL routing
- [ ] Create management commands
- [ ] Write tests

### Frontend Setup
- [ ] Create module pages
- [ ] Implement forms and tables
- [ ] Add routing
- [ ] Create API clients
- [ ] Add to MasterAdmin menu
- [ ] Implement permissions guards

### Database
- [ ] Run migrations for all modules
- [ ] Populate MenuCategory and MenuModule
- [ ] Create ProjectMenuAccess entries
- [ ] Set up UserMenuPermission

## 🔧 Quick Implementation Script

```bash
# Backend: Create module apps
cd /var/www/athens-2.0/backend
for module in ptw incident safety_obs inspection tbt induction job_training worker manpower mom; do
    python manage.py startapp $module
done

# Frontend: Create module structure
cd /var/www/athens-2.0/frontend/src
mkdir -p modules/athens/{ptw,incident,safety-obs,inspection,tbt,induction,job-training,worker,manpower,mom}

# Populate menu data
python manage.py populate_menu_data
```

## 📊 Module Complexity Matrix

| Module | Complexity | Tables | Forms | Priority |
|--------|-----------|--------|-------|----------|
| PTW | High | 5+ | 3+ | Critical |
| Incident | High | 4+ | 2+ | Critical |
| Safety Obs | Medium | 3 | 1 | High |
| Inspection | Medium | 3 | 2 | High |
| TBT | Low | 2 | 1 | High |
| Induction | Medium | 3 | 2 | Medium |
| Job Training | Medium | 3 | 2 | Medium |
| Worker | Medium | 2 | 1 | Medium |
| Manpower | Low | 2 | 1 | Medium |
| MOM | Low | 2 | 1 | Medium |

## 🎯 Recommended Clone Strategy

### Option 1: Full Clone (Comprehensive)
Clone all 29 modules with complete functionality
- **Time:** 3-4 months
- **Team:** 3-4 developers
- **Benefit:** Complete Athens system

### Option 2: Core Modules (Recommended)
Clone top 10 critical modules first
- **Time:** 1-2 months
- **Team:** 2-3 developers
- **Benefit:** 80% functionality, faster delivery

### Option 3: Phased Approach (Agile)
Clone in phases based on priority
- **Phase 1:** PTW, Incident, Safety Obs (3 weeks)
- **Phase 2:** Inspection, TBT, Induction (3 weeks)
- **Phase 3:** Worker, Manpower, MOM (2 weeks)
- **Phase 4:** Remaining modules (4 weeks)

## 📝 Next Steps

1. **Review & Prioritize:** Decide which modules to clone first
2. **Database Schema:** Extract models from Athens project
3. **API Contracts:** Document endpoints and payloads
4. **UI Components:** Identify reusable components
5. **Start Implementation:** Begin with highest priority module

---

**Source:** `/var/www/athens/app/backend/authentication/management/commands/populate_menu_data.py`  
**Total Modules:** 29  
**MasterAdmin Access:** Full access to all modules  
**Last Updated:** February 7, 2025
