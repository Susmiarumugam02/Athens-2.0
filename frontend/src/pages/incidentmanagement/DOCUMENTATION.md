# Incident Management Frontend Documentation

## Overview
The Incident Management frontend module provides a comprehensive solution for reporting, tracking, investigating, and managing workplace incidents. Built with React/TypeScript and Ant Design, it follows the established project patterns and integrates seamlessly with the backend API.

## Architecture

### Directory Structure
```
frontedn/src/features/incidentmanagement/
├── components/
│   ├── IncidentForm.tsx              # Main incident reporting form
│   ├── IncidentList.tsx              # List view with filters and pagination
│   ├── IncidentDetail.tsx            # Detailed incident view with timeline
│   ├── IncidentEdit.tsx              # Edit incident form wrapper
│   ├── InvestigationForm.tsx         # Investigation module with RCA
│   ├── InvestigationView.tsx         # Investigation details display
│   ├── CAPAForm.tsx                  # CAPA management form
│   ├── CAPAList.tsx                  # CAPA tracking list with status
│   ├── IncidentLogbook.tsx           # Central register/logbook
│   ├── IncidentDashboard.tsx         # Analytics dashboard with charts
│   └── IncidentLayout.tsx            # Layout wrapper component
├── pages/
│   ├── IncidentManagement.tsx        # Main page component
│   ├── CreateIncident.tsx            # Create incident page
│   ├── EditIncident.tsx              # Edit incident page
│   └── ViewIncident.tsx              # View incident page
├── hooks/
│   ├── useIncidents.ts               # Custom hooks for incident data
│   ├── useInvestigation.ts           # Investigation-related hooks
│   └── useCapa.ts                    # CAPA management hooks
├── services/
│   └── api.ts                        # API service functions
├── types/
│   └── index.ts                      # TypeScript interfaces
├── utils/
│   ├── validation.ts                 # Form validation rules
│   ├── export.ts                     # Export utilities (PDF/Excel)
│   └── constants.ts                  # Constants and enums
└── routes/
    └── index.tsx                     # Route definitions
```

## Key Components

### 1. IncidentForm.tsx
**Purpose**: Main form for creating and editing incident reports

**Features**:
- Comprehensive incident reporting with all required fields
- File upload support (images, documents, videos)
- Real-time validation with custom rules
- Auto-generation of incident IDs
- Support for both create and edit modes
- Responsive design for mobile/desktop

**Props**:
```typescript
interface IncidentFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Incident>;
  onSubmit: (data: Partial<Incident>) => Promise<void>;
  loading?: boolean;
}
```

**Key Validations**:
- Reporter name: 2-100 characters, alphanumeric only
- Date/time: Cannot be future date
- Description: 10-1000 characters minimum
- File uploads: Max 5 files, 5MB each, specific formats only

### 2. InvestigationForm.tsx
**Purpose**: Comprehensive investigation module with root cause analysis

**Features**:
- Dynamic witness management (up to 50 witnesses)
- Root cause analysis with structured approach
- Evidence file upload (up to 20 files, 10MB each)
- Dynamic recommendations list (up to 30 recommendations)
- Investigation timeline tracking
- Investigator assignment

**Key Fields**:
- Assigned investigator (dropdown from user list)
- Investigation start/end dates
- Witnesses (dynamic list)
- Root cause analysis (5000 character limit)
- Investigation summary (3000 character limit)
- Recommendations (dynamic list)
- Evidence files (multiple formats supported)

### 3. CAPAForm.tsx
**Purpose**: Corrective and Preventive Action management

**Features**:
- Issue tracking with unique CAPA IDs
- Corrective and preventive action planning
- Assignment to responsible persons
- Due date tracking with overdue alerts
- Progress monitoring and status updates
- Verification and closure workflow

**Status Flow**:
```
Pending → In Progress → Completed → Verified
                    ↓
                 Overdue (if past due date)
```

### 4. IncidentLogbook.tsx
**Purpose**: Central register for all incidents with advanced filtering

**Features**:
- Comprehensive incident listing with pagination
- Advanced filtering by multiple criteria
- Export functionality (PDF/Excel)
- Bulk operations support
- Real-time status updates
- Responsive table design

**Filter Options**:
- Department, Status, Severity Level, Incident Type
- Date range selection
- Investigator assignment
- Custom search functionality

### 5. IncidentDashboard.tsx
**Purpose**: Analytics and overview dashboard

**Features**:
- Key performance indicators (KPIs)
- Incident trends and statistics
- Status distribution charts
- Department-wise analysis
- Monthly/quarterly reports
- Real-time data updates

**Charts Included**:
- Incident count by type (Bar chart)
- Severity distribution (Pie chart)
- Monthly trends (Line chart)
- Department comparison (Horizontal bar)
- Status progression (Funnel chart)

## Data Models

### Core Interfaces

```typescript
interface Incident {
  id: string;
  incident_id: string;
  reporter_name: string;
  date_time_incident: string;
  location: string;
  department: string;
  incident_type: 'injury' | 'near_miss' | 'spill' | 'fire' | 'property_damage';
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'reported' | 'under_review' | 'under_investigation' | 'capa_pending' | 'closed';
  project: string;
  reported_by: string;
  assigned_investigator?: string;
  attachments?: IncidentAttachment[];
  created_at: string;
  updated_at: string;
}

interface Investigation {
  id: string;
  incident: string;
  investigator: string;
  start_date: string;
  end_date?: string;
  witnesses: string[];
  root_cause_analysis: string;
  investigation_summary: string;
  recommendations: string[];
  evidence_files?: File[];
}

interface CAPA {
  id: string;
  incident: string;
  issue_id: string;
  corrective_action: string;
  preventive_action?: string;
  assigned_person: string;
  due_date: string;
  completion_status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  verification_date?: string;
  remarks?: string;
}
```

## API Integration

### Service Functions (api.ts)

```typescript
// Incident Management
export const createIncident = (data: Partial<Incident>) => Promise<Incident>
export const updateIncident = (id: string, data: Partial<Incident>) => Promise<Incident>
export const getIncident = (id: string) => Promise<Incident>
export const getIncidents = (filters?: IncidentFilters) => Promise<PaginatedResponse<Incident>>
export const deleteIncident = (id: string) => Promise<void>

// Investigation Management
export const createInvestigation = (data: Partial<Investigation>) => Promise<Investigation>
export const updateInvestigation = (id: string, data: Partial<Investigation>) => Promise<Investigation>
export const getInvestigation = (incidentId: string) => Promise<Investigation>

// CAPA Management
export const createCAPA = (data: Partial<CAPA>) => Promise<CAPA>
export const updateCAPA = (id: string, data: Partial<CAPA>) => Promise<CAPA>
export const getCAPAs = (filters?: CAPAFilters) => Promise<PaginatedResponse<CAPA>>

// File Management
export const uploadAttachment = (file: File, incidentId: string) => Promise<IncidentAttachment>
export const deleteAttachment = (id: string) => Promise<void>

// Export Functions
export const exportIncidents = (format: 'pdf' | 'excel', filters?: IncidentFilters) => Promise<Blob>
export const exportCAPA = (format: 'pdf' | 'excel', filters?: CAPAFilters) => Promise<Blob>
```

## Custom Hooks

### useIncidents.ts
```typescript
export const useIncidents = (filters?: IncidentFilters) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Returns: { incidents, loading, error, refetch, createIncident, updateIncident, deleteIncident }
}
```

### useInvestigation.ts
```typescript
export const useInvestigation = (incidentId: string) => {
  // Returns: { investigation, loading, error, createInvestigation, updateInvestigation }
}
```

### useCapa.ts
```typescript
export const useCapa = (filters?: CAPAFilters) => {
  // Returns: { capas, loading, error, createCAPA, updateCAPA, markComplete }
}
```

## Routing Configuration

```typescript
// routes/index.tsx
const IncidentRoutes = () => (
  <Routes>
    <Route path="/" element={<IncidentLayout />}>
      <Route index element={<IncidentManagement />} />
      <Route path="create" element={<CreateIncident />} />
      <Route path="edit/:id" element={<EditIncident />} />
      <Route path="view/:id" element={<ViewIncident />} />
      <Route path="logbook" element={<IncidentLogbook />} />
      <Route path="dashboard" element={<IncidentDashboard />} />
      <Route path="investigation/:incidentId" element={<InvestigationForm />} />
      <Route path="capa" element={<CAPAList />} />
    </Route>
  </Routes>
);
```

## Role-Based Access Control

### Permission Matrix
```typescript
const permissions = {
  'safety_officer': ['create', 'read', 'update', 'delete', 'investigate', 'assign'],
  'supervisor': ['create', 'read', 'update', 'investigate'],
  'employee': ['create', 'read'],
  'investigator': ['read', 'investigate', 'update_investigation'],
  'admin': ['*'] // All permissions
};
```

### Usage in Components
```typescript
const { hasPermission } = useAuth();

// Conditional rendering based on permissions
{hasPermission('incident.create') && (
  <Button onClick={handleCreate}>Create Incident</Button>
)}
```

## Validation Rules

### Form Validation (validation.ts)
```typescript
export const incidentValidationRules = {
  reporter_name: [
    { required: true, message: 'Reporter name is required' },
    { min: 2, max: 100, message: 'Name must be 2-100 characters' },
    { pattern: /^[a-zA-Z0-9 ]+$/, message: 'Only alphabets and numbers allowed' }
  ],
  date_time_incident: [
    { required: true, message: 'Date and time is required' },
    { validator: validateNotFutureDate }
  ],
  description: [
    { required: true, message: 'Description is required' },
    { min: 10, max: 1000, message: 'Description must be 10-1000 characters' }
  ]
};
```

## Export Functionality

### Supported Formats
- **PDF**: Formatted reports with company branding
- **Excel**: Structured data with filtering capabilities
- **CSV**: Raw data for external analysis

### Export Options
- Individual incident reports
- Bulk incident data with filters
- Investigation reports
- CAPA tracking reports
- Dashboard analytics

## Performance Optimizations

### Implemented Optimizations
1. **Lazy Loading**: Components loaded on demand
2. **Pagination**: Large datasets split into pages
3. **Debounced Search**: Reduced API calls during typing
4. **Memoization**: React.memo for expensive components
5. **Virtual Scrolling**: For large lists
6. **Image Compression**: Automatic compression for uploads

### Bundle Size Management
- Tree shaking for unused code
- Dynamic imports for route-based code splitting
- Optimized Ant Design imports

## Error Handling

### Error Boundaries
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <IncidentManagement />
</ErrorBoundary>
```

### API Error Handling
- Network error recovery
- Validation error display
- User-friendly error messages
- Retry mechanisms for failed requests

## Testing Strategy

### Unit Tests
- Component rendering tests
- Form validation tests
- Hook functionality tests
- Utility function tests

### Integration Tests
- API integration tests
- User workflow tests
- Permission-based access tests

### E2E Tests
- Complete incident reporting flow
- Investigation workflow
- CAPA management process

## Deployment Considerations

### Environment Configuration
```typescript
// config/environment.ts
export const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
  maxFileSize: process.env.REACT_APP_MAX_FILE_SIZE || '5MB',
  supportedFileTypes: ['jpg', 'png', 'pdf', 'docx', 'mp4'],
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true'
};
```

### Build Optimization
- Production build with minification
- Asset optimization and compression
- CDN integration for static assets
- Progressive Web App (PWA) support

## Future Enhancements

### Planned Features
1. **Mobile App**: React Native implementation
2. **Offline Support**: Service worker for offline functionality
3. **AI Integration**: Automated incident classification
4. **Advanced Analytics**: Machine learning insights
5. **Integration APIs**: Third-party system integration
6. **Workflow Automation**: Automated notifications and escalations

### Technical Improvements
- GraphQL integration for better data fetching
- Real-time updates with WebSocket
- Advanced caching strategies
- Micro-frontend architecture consideration

## Troubleshooting

### Common Issues
1. **File Upload Failures**: Check file size and format restrictions
2. **Permission Errors**: Verify user roles and permissions
3. **API Timeouts**: Implement retry logic and loading states
4. **Memory Leaks**: Proper cleanup in useEffect hooks

### Debug Tools
- React Developer Tools
- Network tab for API debugging
- Console logging for state tracking
- Performance profiler for optimization

---

This documentation provides a comprehensive guide for developers working on the Incident Management frontend module. For backend integration details, refer to the backend documentation.