# ERGON Task Management System - Complete Specification

## Overview
ERGON's Task Management System is a comprehensive solution for creating, tracking, and managing tasks with advanced features including follow-ups, recurring tasks, progress tracking, and integration with daily planner and notifications.

## 1. TASK CREATION FORM

### 1.1 Basic Information Fields
- **Title** (Required)
  - Type: Text input
  - Validation: Required, max 255 characters
  - Placeholder: "e.g., Update homepage banner, Fix login bug, Review project proposal"
  - Help: Clear, specific description of what needs to be done

- **Task Type** (Required)
  - Type: Select dropdown
  - Options:
    - `ad-hoc`: 📋 Task (General work item)
    - `checklist`: ✅ Checklist (Multiple steps)
    - `milestone`: 🎯 Milestone (Important goal)
    - `timed`: ⏰ Urgent (Time-critical)
  - Default: `ad-hoc`

- **Description**
  - Type: Textarea (3 rows)
  - Validation: Optional, unlimited text
  - Placeholder: "What needs to be done? What are the requirements? What defines completion?"
  - Help: Include requirements, acceptance criteria, resources needed, expected outcome

### 1.2 Assignment & Scheduling Fields
- **Assignment Type** (Required)
  - Type: Select dropdown
  - Options:
    - `self`: For Myself (I will do this)
    - `other`: For Others (Delegate to team member)
  - Default: `self`
  - Functionality: Controls visibility of user selection

- **Assign To** (Required)
  - Type: Select dropdown
  - Source: Active users from database
  - Validation: Required, must be valid user ID
  - Dynamic: Populated based on assignment type

- **Planned Date**
  - Type: Date input
  - Validation: Optional, minimum today's date
  - Help: When you plan to start working on this task

### 1.3 Task Configuration Fields
- **Project** (Required)
  - Type: Select dropdown
  - Source: Active projects from database
  - Validation: Required
  - Functionality: Filters departments and categories

- **Department**
  - Type: Select dropdown
  - Source: Departments table, filtered by project
  - Validation: Optional
  - Dynamic: Auto-populated based on project selection

- **Category**
  - Type: Select dropdown
  - Source: Task categories API, filtered by department
  - Validation: Optional
  - Dynamic: Loaded via AJAX based on department

- **Priority** (Required)
  - Type: Select dropdown
  - Options:
    - `low`: 🟢 Low (Routine, can wait)
    - `medium`: 🟡 Medium (Normal priority) - Default
    - `high`: 🔴 High (Urgent/Important)

### 1.4 Timeline & Progress Fields
- **Due Date**
  - Type: Date input
  - Validation: Optional, minimum today's date
  - Help: Hard deadline when task must be completed

- **SLA Time**
  - Type: Dual number inputs (hours + minutes)
  - Fields: `sla_hours_part` (0-720), `sla_minutes_part` (0-59)
  - Calculation: Combined into decimal hours (e.g., 2h 30m = 2.5)
  - Default: 0h 15m (0.25 hours)
  - Storage: DECIMAL(8,4) in database

- **Initial Status** (Required)
  - Type: Select dropdown
  - Options:
    - `assigned`: 📋 Assigned - Default
    - `in_progress`: ⚡ In Progress
    - `cancelled`: ❌ Cancelled
    - `suspended`: ⏸️ Suspended

- **Initial Progress**
  - Type: Range slider (0-100)
  - Default: 0%
  - Functionality: Auto-updates status based on progress value
  - Display: Real-time percentage display

### 1.5 Additional Options (Toggle Cards)
- **Follow-up Required**
  - Type: Toggle switch
  - Default: Off
  - Functionality: Shows/hides follow-up fields section

- **Reminder Notifications**
  - Type: Toggle switch
  - Default: On
  - Functionality: Enables deadline notifications

- **Track Time**
  - Type: Toggle switch
  - Default: Off
  - Functionality: Enables time tracking features

- **Recurring Task**
  - Type: Toggle switch
  - Default: Off
  - Functionality: Shows/hides recurring schedule fields

### 1.6 Recurring Schedule Fields (Conditional)
- **Repeat Frequency** (Required when recurring enabled)
  - Type: Select dropdown
  - Options:
    - `weekly`: 📅 Weekly
    - `monthly`: 📆 Monthly
    - `quarterly`: 📅 Quarterly (3 months)
    - `half_yearly`: 📆 Half Yearly (6 months)
    - `annually`: 📅 Annually (12 months)

- **Repeat Every**
  - Type: Number input + dynamic label
  - Range: 1-52 (varies by frequency type)
  - Default: 1
  - Label: Updates based on frequency (week(s), month(s), etc.)

- **End Recurrence**
  - Type: Date input
  - Validation: Optional, minimum 1 week from today
  - Help: When to stop creating recurring tasks

### 1.7 Follow-up Fields (Conditional)
- **Follow-up Type** (Required when follow-up enabled)
  - Type: Select dropdown
  - Options:
    - `standalone`: Standalone Follow-up
    - `task`: Task-linked Follow-up - Default

- **Contact**
  - Type: Select dropdown with search
  - Source: Contacts table
  - Validation: Optional
  - Functionality: Auto-fills manual contact fields

- **Follow-up Date** (Required when follow-up enabled)
  - Type: Date input
  - Default: Tomorrow
  - Validation: Required, minimum today

- **Follow-up Title** (Required when follow-up enabled)
  - Type: Text input
  - Auto-generation: "Follow-up: [Task Title]"
  - Validation: Required when follow-up enabled

- **Follow-up Description**
  - Type: Textarea (3 rows)
  - Validation: Optional
  - Help: Additional context or notes

- **Manual Contact Fields**
  - **Company**: Text input
  - **Contact Person**: Text input
  - **Phone**: Tel input
  - **Project**: Text input

## 2. DATABASE SCHEMA

### 2.1 Tasks Table Structure
```sql
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_by INT DEFAULT NULL,
    assigned_to INT DEFAULT NULL,
    task_type ENUM('checklist','milestone','timed','ad-hoc') DEFAULT 'ad-hoc',
    priority ENUM('low','medium','high') DEFAULT 'medium',
    deadline DATETIME DEFAULT NULL,
    progress INT DEFAULT 0,
    status ENUM('assigned','in_progress','completed','cancelled','suspended') DEFAULT 'assigned',
    due_date DATE DEFAULT NULL,
    depends_on_task_id INT DEFAULT NULL,
    sla_hours DECIMAL(8,4) DEFAULT 0.25,
    department_id INT DEFAULT NULL,
    task_category VARCHAR(100) DEFAULT NULL,
    project_id INT DEFAULT NULL,
    planned_date DATE DEFAULT NULL,
    followup_required TINYINT(1) DEFAULT 0,
    progress_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2.2 Related Tables
- **task_progress_history**: Tracks progress updates
- **task_history**: Comprehensive audit trail
- **followups**: Linked follow-up records
- **daily_tasks**: Daily planner integration
- **users**: User assignments
- **departments**: Department categorization
- **projects**: Project associations
- **contacts**: Follow-up contacts

## 3. CONTROLLER FUNCTIONALITY

### 3.1 TasksController Methods

#### create()
- **Purpose**: Display task creation form
- **Authentication**: Required
- **Module Check**: Tasks module must be enabled
- **Data Loading**:
  - Active users (filtered by role)
  - Departments with defaults
  - Active projects
  - Contacts for follow-ups
- **View**: `tasks/create.php`

#### store()
- **Purpose**: Process task creation
- **Method**: POST
- **Validation**:
  - Title: Required, non-empty
  - Assigned To: Required, valid user ID
  - Progress: 0-100 range
  - Follow-up fields: Required when follow-up enabled
- **Processing**:
  1. Data sanitization and validation
  2. Task record creation
  3. History logging (creation, assignment)
  4. Follow-up creation (if enabled)
  5. Notification dispatch
  6. Daily planner sync
- **Response**: Redirect with success/error message

#### edit($id)
- **Purpose**: Display task edit form / Process updates
- **Authentication**: Required
- **Permission Check**: 
  - Assigned user can edit
  - Task creator can edit
  - Admins can edit any task
- **GET**: Load form with existing data
- **POST**: Process updates with change tracking

#### updateStatus()
- **Purpose**: AJAX progress updates
- **Method**: POST (JSON)
- **Input**: task_id, progress, description
- **Validation**:
  - Permission check (assigned user or admin)
  - Progress range (0-100)
  - Description required
- **Processing**:
  1. Progress history logging
  2. Status auto-update based on progress
  3. Daily planner sync
- **Response**: JSON success/error

#### viewTask($id)
- **Purpose**: Display task details
- **Authentication**: Required
- **Permission Check**: Involved users + admins
- **Data Loading**:
  - Task details with user names
  - Linked follow-ups
  - Progress history
  - Task history
- **View**: `tasks/view.php`

#### delete($id)
- **Purpose**: Cascade delete task
- **Method**: DELETE/POST
- **Authentication**: Required
- **Processing**:
  1. Transaction start
  2. Delete followups (task_id reference)
  3. Delete daily_tasks entries
  4. Delete main task record
  5. Audit logging
- **Response**: JSON success/error

### 3.2 Additional Methods
- **kanban()**: Kanban board view
- **calendar()**: Calendar view
- **getTaskSchedule()**: Task visualization data
- **getProgressHistory($id)**: AJAX progress history
- **getTaskHistory($id)**: AJAX comprehensive history

## 4. TASK MODEL FUNCTIONALITY

### 4.1 Core Methods
- **create($data)**: Insert new task
- **updateProgress($taskId, $userId, $progress, $description)**: Update with history
- **getProgressHistory($taskId)**: Retrieve progress timeline
- **getTaskById($taskId)**: Get task with user details
- **update($id, $data)**: Update task with sync
- **delete($id)**: Cascade delete with transaction

### 4.2 Integration Methods
- **syncWithDailyPlanner($taskId, $status, $progress)**: Sync with planner
- **syncWithFollowups($taskId, $status)**: Update linked follow-ups

## 5. CONNECTIVITY & INTEGRATIONS

### 5.1 Daily Planner Integration
- **Sync Triggers**: Task creation, updates, status changes
- **Sync Data**: Status, progress, completion time
- **Table**: `daily_tasks`
- **Functionality**:
  - Auto-add tasks with planned_date
  - Update progress in real-time
  - Handle task reassignment
  - Mark completion timestamps

### 5.2 Follow-up System Integration
- **Auto-Creation**: When followup_required is enabled
- **Data Sync**: Task completion updates follow-up status
- **Contact Management**: Auto-create/update contacts
- **Table**: `followups`
- **Functionality**:
  - Task-linked follow-ups
  - Contact auto-fill
  - Status synchronization

### 5.3 Notification System
- **Triggers**:
  - Task assignment
  - Status changes
  - Progress updates
  - Deadline reminders
- **Recipients**: Assigned users, task creators, admins
- **Methods**: In-app notifications, email alerts
- **Helper**: `NotificationHelper::notifyUser()`

### 5.4 User Management Integration
- **Assignment**: Dynamic user loading with role filtering
- **Permissions**: Role-based access control
- **Authentication**: Session-based with middleware
- **API**: `/ergon/api/users` for AJAX loading

### 5.5 Department & Project Integration
- **Hierarchical**: Project → Department → Category
- **Dynamic Loading**: AJAX-based filtering
- **APIs**:
  - `/ergon/api/departments`
  - `/ergon/api/task-categories?department_id=X`
- **Default Data**: Auto-creation of standard departments/projects

## 6. FORM VALIDATION & SECURITY

### 6.1 Client-Side Validation
- **Required Fields**: Real-time validation
- **Date Constraints**: Minimum date validation
- **Progress Range**: 0-100 enforcement
- **Conditional Validation**: Follow-up and recurring fields
- **Form Submission**: Comprehensive pre-submit checks

### 6.2 Server-Side Security
- **CSRF Protection**: Token validation on all forms
- **Input Sanitization**: `Security::sanitizeString()`
- **SQL Injection**: Prepared statements throughout
- **Permission Checks**: Role-based access control
- **Data Validation**: Type checking and range validation

### 6.3 Authentication & Authorization
- **Middleware**: `AuthMiddleware::requireAuth()`
- **Module Check**: `ModuleMiddleware::requireModule('tasks')`
- **Permission Matrix**:
  - View: Assigned user, creator, admins
  - Edit: Assigned user, creator, admins
  - Delete: Creator, admins
  - Progress Update: Assigned user, admins

## 7. USER INTERFACE FEATURES

### 7.1 Form Enhancement
- **Help System**: Comprehensive help panel with guides
- **Field Hints**: Contextual help for each field
- **Progress Visualization**: Real-time slider with percentage
- **Toggle Cards**: Modern UI for optional features
- **Dynamic Fields**: Show/hide based on selections

### 7.2 AJAX Functionality
- **Dynamic Dropdowns**: Department/category filtering
- **User Loading**: Assignment type-based user lists
- **Progress Updates**: Real-time progress submission
- **History Loading**: On-demand history display

### 7.3 Responsive Design
- **Mobile Optimized**: Grid layouts adapt to screen size
- **Touch Friendly**: Large touch targets for mobile
- **Progressive Enhancement**: Works without JavaScript

## 8. API ENDPOINTS

### 8.1 Task Management APIs
- **GET /ergon/tasks**: List tasks (with filtering)
- **POST /ergon/tasks/create**: Create new task
- **GET /ergon/tasks/edit/{id}**: Edit form
- **POST /ergon/tasks/edit/{id}**: Update task
- **DELETE /ergon/tasks/delete/{id}**: Delete task
- **POST /ergon/tasks/updateStatus**: AJAX progress update

### 8.2 Supporting APIs
- **GET /ergon/api/users**: User list for assignment
- **GET /ergon/api/departments**: Department list
- **GET /ergon/api/task-categories**: Category list by department
- **GET /ergon/tasks/getProgressHistory/{id}**: Progress timeline
- **GET /ergon/tasks/getTaskHistory/{id}**: Complete history

## 9. WORKFLOW PROCESSES

### 9.1 Task Creation Workflow
1. User accesses creation form
2. Form loads with user data and options
3. User fills required fields
4. Optional features configured (follow-up, recurring)
5. Client-side validation
6. Form submission with CSRF token
7. Server-side validation and processing
8. Database record creation
9. History logging
10. Follow-up creation (if enabled)
11. Notification dispatch
12. Daily planner sync
13. Success redirect

### 9.2 Task Update Workflow
1. Permission check
2. Load existing data
3. User makes changes
4. Change detection and comparison
5. Update processing
6. History logging for each change
7. Sync with related systems
8. Notification dispatch (if needed)
9. Success confirmation

### 9.3 Progress Update Workflow
1. AJAX request with progress data
2. Permission validation
3. Progress history creation
4. Status auto-update logic
5. Daily planner sync
6. Real-time UI update
7. Success response

## 10. ERROR HANDLING & LOGGING

### 10.1 Error Handling
- **Database Errors**: Try-catch with fallback data
- **Validation Errors**: User-friendly messages
- **Permission Errors**: Redirect with error message
- **AJAX Errors**: JSON error responses

### 10.2 Logging
- **Task Actions**: Comprehensive history logging
- **System Events**: Error logging with context
- **User Actions**: Audit trail maintenance
- **Performance**: Query optimization logging

## 11. PERFORMANCE OPTIMIZATIONS

### 11.1 Database Optimizations
- **Indexes**: Strategic indexing on frequently queried fields
- **Prepared Statements**: Consistent use throughout
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Minimal data fetching

### 11.2 Frontend Optimizations
- **AJAX Loading**: Reduce page reloads
- **Lazy Loading**: Load data on demand
- **Caching**: Browser caching for static resources
- **Minification**: Compressed CSS/JS

This comprehensive specification covers all aspects of ERGON's Task Management System, from form fields to database connectivity, providing a complete reference for development and maintenance.