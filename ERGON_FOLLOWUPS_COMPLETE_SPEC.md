# ERGON Follow-ups System - Complete Specification

## Overview
ERGON's Follow-ups System is a comprehensive contact relationship management solution that enables users to create, track, and manage follow-up activities with clients, prospects, and stakeholders. The system supports both standalone follow-ups and task-linked follow-ups with full integration to the task management system.

## 1. FOLLOW-UP CREATION FORM

### 1.1 Basic Information Fields
- **Follow-up Type** (Required)
  - Type: Select dropdown
  - Options:
    - `standalone`: Standalone Follow-up
    - `task`: Task-linked Follow-up - Default
  - Functionality: Controls visibility of task selection field

- **Link to Task** (Conditional - Required when type is 'task')
  - Type: Select dropdown
  - Source: Active tasks from tasks table
  - Display: Task title with due date if available
  - Validation: Required when follow-up type is 'task'

- **Contact** (Required)
  - Type: Select dropdown with search
  - Source: Contacts table
  - Display: Contact name with company if available
  - Functionality: Auto-fills manual contact fields when selected

- **Follow-up Date** (Required)
  - Type: Date input
  - Default: Today's date
  - Validation: Required, minimum today
  - Help: When should this follow-up be performed?

- **Title** (Required)
  - Type: Text input
  - Placeholder: "e.g., Follow up on proposal discussion"
  - Validation: Required when follow-up enabled
  - Help: Brief description of what this follow-up is about

- **Description**
  - Type: Textarea (4 rows)
  - Placeholder: "Additional details about this follow-up..."
  - Validation: Optional
  - Help: Add more context or notes about this follow-up

### 1.2 Quick Contact Creation Section
- **Contact Name** (Required for quick creation)
  - Type: Text input
  - Placeholder: "Contact name"
  - Validation: Required for contact creation

- **Phone**
  - Type: Tel input
  - Placeholder: "Phone number"
  - Validation: Optional

- **Email**
  - Type: Email input
  - Placeholder: "Email address"
  - Validation: Optional

- **Company**
  - Type: Text input
  - Placeholder: "Company name"
  - Validation: Optional

## 2. DATABASE SCHEMA

### 2.1 Followups Table Structure
```sql
CREATE TABLE followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    contact_id INT,
    task_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    followup_type ENUM('standalone', 'task') DEFAULT 'standalone',
    follow_up_date DATE NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled', 'postponed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_contact_id (contact_id),
    INDEX idx_task_id (task_id),
    INDEX idx_follow_up_date (follow_up_date),
    INDEX idx_status (status)
);
```

### 2.2 Related Tables
- **contacts**: Contact information storage
- **followup_history**: Audit trail for follow-up changes
- **tasks**: Task linkage for task-based follow-ups
- **users**: User assignments and ownership

### 2.3 Contacts Table Structure
```sql
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2.4 Followup History Table Structure
```sql
CREATE TABLE followup_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    followup_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_value TEXT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_followup_id (followup_id)
);
```

## 3. CONTROLLER FUNCTIONALITY

### 3.1 ContactFollowupController Methods

#### index()
- **Purpose**: Display follow-ups overview with contact grouping
- **Authentication**: Required
- **Module Check**: Followups module must be enabled
- **Data Loading**:
  - Contacts with follow-up counts
  - Overdue, today, and completed statistics
  - Role-based filtering (users see own, admins see all)
- **View**: `contact_followups/index.php`

#### createStandaloneFollowup()
- **Purpose**: Display creation form / Process creation
- **Authentication**: Required
- **GET**: Load form with contacts and tasks
- **POST**: Process creation with validation
- **AJAX Support**: Detects AJAX requests for API responses
- **Processing**:
  1. Data validation (title required)
  2. Contact creation/selection handling
  3. Follow-up record creation
  4. History logging
  5. Task assignment (if task-linked)

#### completeFollowup($id)
- **Purpose**: Mark follow-up as completed
- **Method**: POST (AJAX)
- **Authentication**: Required
- **Processing**:
  1. Status update to 'completed'
  2. Completion timestamp
  3. History logging
  4. Linked task status update (if applicable)
- **Response**: JSON success/error

#### cancelFollowup($id)
- **Purpose**: Cancel follow-up with reason
- **Method**: POST (AJAX)
- **Input**: Reason (required)
- **Validation**: Reason required, valid follow-up ID
- **Processing**:
  1. Status update to 'cancelled'
  2. History logging with reason
- **Response**: JSON success/error

#### rescheduleFollowup($id)
- **Purpose**: Reschedule follow-up to new date
- **Method**: POST (AJAX)
- **Input**: new_date, reason
- **Validation**: Valid date format, reason required
- **Processing**:
  1. Date validation and comparison
  2. Status update to 'postponed'
  3. History logging with old/new dates
- **Response**: JSON success/error

#### checkReminders()
- **Purpose**: Get today's follow-up reminders
- **Method**: GET (AJAX)
- **Response**: JSON with reminders array and count
- **Query**: Today's pending/in-progress follow-ups

### 3.2 Contact Management Methods

#### createContact()
- **Purpose**: Create new contact via AJAX
- **Method**: POST (JSON)
- **Input**: name (required), phone, email, company
- **Validation**: Name required
- **Response**: JSON with contact_id or error

#### getContact($id)
- **Purpose**: Retrieve contact details
- **Method**: GET (AJAX)
- **Response**: JSON with contact data

#### updateContact($id)
- **Purpose**: Update contact information
- **Method**: POST
- **Input**: name (required), phone, email, company
- **Response**: JSON success/error

## 4. FOLLOW-UP MODEL FUNCTIONALITY

### 4.1 Core Methods
- **create($data)**: Insert new follow-up with history
- **getByUser($userId, $date)**: Get user's follow-ups with stats
- **getById($id)**: Get follow-up with department details
- **update($id, $data)**: Update follow-up information
- **reschedule($id, $newDate, $reason, $userId)**: Reschedule with history
- **complete($id, $notes, $userId)**: Complete with history logging

### 4.2 Query Methods
- **getUpcoming($userId, $days)**: Get upcoming follow-ups
- **getOverdue($userId)**: Get overdue follow-ups
- **getHistory($followupId)**: Get complete audit trail

## 5. CONNECTIVITY & INTEGRATIONS

### 5.1 Task Management Integration
- **Auto-Creation**: Tasks with followup_required create linked follow-ups
- **Status Synchronization**: Task completion updates follow-up status
- **Bidirectional Updates**: Follow-up completion can update task status
- **Data Sync**: Contact information shared between systems

### 5.2 Contact Management Integration
- **Auto-Fill**: Selecting contact populates manual fields
- **Quick Creation**: Create contacts on-the-fly during follow-up creation
- **Contact Search**: Type-ahead search in contact selection
- **Contact Updates**: Manual contact fields update existing records

### 5.3 User Management Integration
- **Assignment**: Follow-ups assigned to task assignees automatically
- **Permissions**: Role-based access (users see own, admins see all)
- **Authentication**: Session-based with middleware protection

### 5.4 Notification System Integration
- **Reminders**: Daily reminder checks for due follow-ups
- **Status Alerts**: Notifications for follow-up completions
- **Overdue Alerts**: Automatic alerts for overdue follow-ups

## 6. FORM VALIDATION & SECURITY

### 6.1 Client-Side Validation
- **Required Fields**: Real-time validation for title, contact, date
- **Date Constraints**: Minimum date validation
- **Contact Selection**: Required contact or manual entry
- **Form Submission**: Comprehensive pre-submit checks

### 6.2 Server-Side Security
- **Input Sanitization**: All inputs sanitized and validated
- **SQL Injection**: Prepared statements throughout
- **Permission Checks**: User ownership validation
- **Data Validation**: Type checking and business rule validation

### 6.3 AJAX Security
- **CSRF Protection**: Token validation on AJAX requests
- **Request Method**: Proper HTTP method validation
- **JSON Validation**: Input parsing and validation
- **Error Handling**: Secure error messages

## 7. USER INTERFACE FEATURES

### 7.1 Form Enhancement
- **Dynamic Fields**: Task selection based on follow-up type
- **Contact Auto-Fill**: Automatic field population
- **Quick Contact Creation**: Inline contact creation
- **Date Defaults**: Smart date defaulting

### 7.2 AJAX Functionality
- **Contact Creation**: Real-time contact creation
- **Status Updates**: Instant status changes
- **History Loading**: On-demand history display
- **Reminder Checks**: Periodic reminder polling

### 7.3 Responsive Design
- **Mobile Optimized**: Touch-friendly interface
- **Grid Layouts**: Responsive form layouts
- **Progressive Enhancement**: Works without JavaScript

## 8. API ENDPOINTS

### 8.1 Follow-up Management APIs
- **POST /ergon/contacts/followups/create**: Create follow-up
- **POST /ergon/contacts/followups/complete/{id}**: Complete follow-up
- **POST /ergon/contacts/followups/cancel/{id}**: Cancel follow-up
- **POST /ergon/contacts/followups/reschedule/{id}**: Reschedule follow-up
- **GET /ergon/contacts/followups/reminders**: Get reminders

### 8.2 Contact Management APIs
- **POST /ergon/api/contacts/create**: Create contact
- **GET /ergon/contacts/followups/contact/{id}**: Get contact
- **POST /ergon/contacts/followups/contact/{id}**: Update contact

## 9. WORKFLOW PROCESSES

### 9.1 Follow-up Creation Workflow
1. User accesses creation form
2. Form loads with contacts and tasks
3. User selects follow-up type
4. Conditional fields appear based on type
5. Contact selection or quick creation
6. Form validation and submission
7. Database record creation
8. History logging
9. Task linkage (if applicable)
10. Success confirmation

### 9.2 Follow-up Completion Workflow
1. User initiates completion
2. Permission validation
3. Status update to completed
4. Completion timestamp recording
5. History logging
6. Linked task status update
7. Success notification

### 9.3 Follow-up Rescheduling Workflow
1. User requests reschedule
2. Date and reason validation
3. Date comparison checks
4. Status update to postponed
5. History logging with details
6. Success confirmation

## 10. BUSINESS RULES

### 10.1 Follow-up Rules
- **Contact Requirement**: Every follow-up must have a contact
- **Date Validation**: Follow-up date cannot be in the past
- **Status Progression**: Logical status transitions only
- **History Tracking**: All changes must be logged

### 10.2 Task Integration Rules
- **Auto-Assignment**: Task-linked follow-ups assigned to task assignee
- **Status Sync**: Task completion triggers follow-up completion
- **Bidirectional Updates**: Follow-up completion can update task
- **Data Consistency**: Contact information synchronized

### 10.3 Contact Management Rules
- **Duplicate Prevention**: Check for existing contacts before creation
- **Data Validation**: Name required, other fields optional
- **Auto-Update**: Manual fields update existing contact records
- **Search Functionality**: Type-ahead search for contact selection

## 11. REPORTING & ANALYTICS

### 11.1 Follow-up Statistics
- **Completion Rates**: Track follow-up completion percentages
- **Response Times**: Measure time from creation to completion
- **Overdue Analysis**: Monitor overdue follow-up trends
- **Contact Engagement**: Track follow-up frequency per contact

### 11.2 Performance Metrics
- **User Productivity**: Follow-ups completed per user
- **Task Integration**: Task-linked vs standalone follow-up success
- **Reschedule Patterns**: Analyze rescheduling frequency
- **Contact Relationship**: Follow-up effectiveness per contact

## 12. ERROR HANDLING & LOGGING

### 12.1 Error Handling
- **Database Errors**: Graceful fallback with user messages
- **Validation Errors**: Clear, actionable error messages
- **Permission Errors**: Secure error responses
- **AJAX Errors**: JSON error responses with details

### 12.2 Logging
- **Follow-up Actions**: Complete audit trail
- **System Events**: Error logging with context
- **User Actions**: History maintenance
- **Integration Events**: Task/contact sync logging

This comprehensive specification covers all aspects of ERGON's Follow-ups System, providing complete reference for development, maintenance, and integration with other system components.