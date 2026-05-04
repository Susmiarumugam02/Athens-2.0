# ERGON Daily Planner System - Complete Specification

## Overview
ERGON's Daily Planner System is an advanced task execution workflow platform that provides real-time task management, SLA tracking, time monitoring, and comprehensive task lifecycle management. The system supports task rollover, postponement, progress tracking, and seamless integration with the main task management system.

## 1. DAILY PLANNER INTERFACE

### 1.1 Date Navigation Controls
- **Date Selector**
  - Type: Date input
  - Range: -90 days to +30 days from current date
  - Functionality: Changes planner view to selected date
  - Validation: Prevents access to dates beyond allowed range

- **View Mode Indicators**
  - **Historical View** (Past dates): 📜 Read-only, shows completed/rolled-over tasks
  - **Execution Mode** (Current date): 🎯 Full functionality, real-time updates
  - **Planning Mode** (Future dates): 📅 Planning interface, limited actions

### 1.2 Task Execution Controls
- **Start Task**
  - Action: Begins task timer and SLA countdown
  - Status Change: not_started → in_progress
  - SLA Calculation: Sets end time based on task SLA hours
  - Availability: Current date only

- **Pause/Break Task**
  - Action: Pauses active timer, preserves SLA time
  - Status Change: in_progress → on_break
  - Time Tracking: Records pause duration
  - Availability: Active tasks only

- **Resume Task**
  - Action: Resumes timer with remaining SLA time
  - Status Change: on_break → in_progress
  - SLA Adjustment: Recalculates end time based on remaining time
  - Availability: Paused tasks only

- **Update Progress**
  - Input: Progress percentage (0-100%) + description
  - Validation: Description required for all updates
  - Status Logic: Auto-updates status based on progress
  - Sync: Updates both daily_tasks and main tasks table

- **Postpone Task**
  - Input: New date + reason
  - Action: Creates new entry on target date, marks current as postponed
  - Validation: Future date required, reason optional
  - Availability: Current date only

### 1.3 Task Information Display
- **Task Card Components**:
  - Title with source indicator (👥 From Others, 👤 Self-Assigned)
  - Priority and status badges
  - Description text
  - Progress bar (if progress > 0)
  - SLA timing grid
  - Action buttons

- **SLA Timing Grid**:
  - **Remaining Time**: Live countdown during execution
  - **SLA Time**: Total allocated time for task
  - **Time Used**: Active time + break time
  - **Break Time**: Total pause duration

## 2. DATABASE SCHEMA

### 2.1 Daily Tasks Table Structure
```sql
CREATE TABLE daily_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NULL,
    original_task_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    planned_start_time TIME NULL,
    planned_duration INT DEFAULT 60,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'not_started',
    completed_percentage INT DEFAULT 0,
    start_time TIMESTAMP NULL,
    pause_time TIMESTAMP NULL,
    pause_start_time TIMESTAMP NULL,
    resume_time TIMESTAMP NULL,
    completion_time TIMESTAMP NULL,
    sla_end_time TIMESTAMP NULL,
    active_seconds INT DEFAULT 0,
    pause_duration INT DEFAULT 0,
    postponed_from_date DATE NULL,
    postponed_to_date DATE NULL,
    source_field VARCHAR(50) NULL,
    rollover_source_date DATE NULL,
    rollover_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_id, scheduled_date),
    INDEX idx_task_id (task_id),
    INDEX idx_original_task_id (original_task_id),
    INDEX idx_status (status),
    INDEX idx_rollover_source (rollover_source_date)
);
```

### 2.2 Related Tables
- **tasks**: Main task records for synchronization
- **daily_task_history**: Audit trail for all daily task actions
- **sla_history**: SLA timer events and duration tracking
- **daily_performance**: Daily statistics and performance metrics

### 2.3 Daily Task History Table
```sql
CREATE TABLE daily_task_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_task_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_daily_task_id (daily_task_id)
);
```

### 2.4 SLA History Table
```sql
CREATE TABLE sla_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_task_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    duration_seconds INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_daily_task_id (daily_task_id)
);
```

## 3. CONTROLLER FUNCTIONALITY

### 3.1 UnifiedWorkflowController Methods

#### dailyPlanner($date)
- **Purpose**: Main daily planner interface
- **Authentication**: Required
- **Module Check**: Daily planner module must be enabled
- **Date Validation**: Ensures valid date format and range
- **Processing**:
  1. Date validation and mode determination
  2. Auto-rollover for current date access
  3. Task fetching and synchronization
  4. Statistics calculation
  5. View rendering with appropriate mode

#### startTask()
- **Purpose**: Begin task execution with SLA timer
- **Method**: POST (JSON)
- **Input**: task_id
- **Processing**:
  1. Task validation and permission check
  2. SLA end time calculation
  3. Status update to 'in_progress'
  4. Timer initialization
  5. History logging
- **Response**: JSON with timer details

#### pauseTask()
- **Purpose**: Pause active task preserving SLA time
- **Method**: POST (JSON)
- **Input**: task_id
- **Processing**:
  1. Active time calculation
  2. Remaining SLA time preservation
  3. Status update to 'on_break'
  4. Pause duration tracking
  5. History logging
- **Response**: JSON with pause confirmation

#### resumeTask()
- **Purpose**: Resume paused task with remaining SLA
- **Method**: POST (JSON)
- **Input**: task_id
- **Processing**:
  1. Pause duration calculation
  2. New SLA end time calculation
  3. Status update to 'in_progress'
  4. Timer restart
  5. History logging
- **Response**: JSON with resume confirmation

#### completeTask()
- **Purpose**: Mark task as completed with progress
- **Method**: POST (JSON)
- **Input**: task_id, percentage
- **Processing**:
  1. Completion validation
  2. Active time calculation
  3. Status update to 'completed'
  4. Main task synchronization
  5. Performance metrics update
- **Response**: JSON success/error

#### postponeTask()
- **Purpose**: Move task to future date
- **Method**: POST (JSON)
- **Input**: task_id, new_date
- **Processing**:
  1. Date validation
  2. Duplicate prevention
  3. Current task status update to 'postponed'
  4. New task entry creation for target date
  5. History logging
- **Response**: JSON success/error

#### updateTaskStatus()
- **Purpose**: Generic status update handler
- **Method**: POST (JSON)
- **Input**: task_id, action, additional parameters
- **Processing**: Routes to appropriate specific method
- **Actions Supported**: start, pause, resume, complete, postpone

#### getTaskTimer()
- **Purpose**: Get current timer state for task
- **Method**: GET (AJAX)
- **Input**: task_id
- **Response**: JSON with active_seconds and status

### 3.2 Task Synchronization Methods

#### getTasksForDate()
- **Purpose**: Retrieve tasks for specific date
- **Processing**:
  1. Fetch assigned tasks first
  2. Query daily_tasks with proper ordering
  3. Include rollover and source information
- **Return**: Array of task data with timing information

#### fetchAssignedTasksForDate()
- **Purpose**: Sync tasks from main tasks table
- **Processing**:
  1. Date-specific task queries
  2. Duplicate prevention
  3. Status preservation for historical dates
  4. Task creation with proper metadata
- **Return**: Count of newly added tasks

## 4. DAILY PLANNER MODEL FUNCTIONALITY

### 4.1 Core Task Management
- **getTasksForDate($userId, $date)**: Retrieve and sync tasks for date
- **startTask($taskId, $userId)**: Initialize task execution
- **pauseTask($taskId, $userId)**: Pause with SLA preservation
- **resumeTask($taskId, $userId)**: Resume with remaining time
- **completeTask($taskId, $userId, $percentage)**: Complete with sync
- **postponeTask($taskId, $userId, $newDate)**: Move to future date

### 4.2 Rollover System
- **getRolloverTasks($userId)**: Detect eligible tasks for rollover
- **performRollover($eligibleTasks, $userId)**: Execute rollover process
- **cleanupDuplicateTasks($userId, $date)**: Remove duplicate entries
- **autoRollover($userId)**: Automated rollover execution

### 4.3 Statistics and Performance
- **getDailyStats($userId, $date)**: Calculate daily performance metrics
- **updateDailyPerformance($userId, $date)**: Update performance records
- **calculateActiveTime($taskId)**: Calculate current active time
- **calculateRemainingSlaTime($task)**: Calculate remaining SLA time

## 5. ROLLOVER SYSTEM

### 5.1 Rollover Detection
- **Eligible Statuses**: not_started, in_progress, on_break
- **Date Criteria**: scheduled_date < current date
- **Completion Check**: completed_percentage < 100
- **Duplicate Prevention**: Prevents multiple rollovers of same task

### 5.2 Rollover Execution
- **Data Preservation**: Maintains original task data
- **Status Options**: Configurable status preservation or reset
- **Audit Trail**: Complete logging of rollover actions
- **Performance Impact**: Optimized queries for large datasets

### 5.3 Rollover Configuration
```php
public $autoRollover = true;        // Enable automatic rollover
public $manualTrigger = true;       // Allow manual rollover trigger
public $preserveStatus = true;      // Retain original status
public $userOptOut = false;         // Allow user disable per task
```

## 6. SLA TIMER SYSTEM

### 6.1 Timer Initialization
- **SLA Calculation**: Based on task sla_hours (default 0.25 hours)
- **End Time Setting**: Current time + SLA duration
- **Status Tracking**: Real-time status monitoring
- **Persistence**: Timer state preserved across sessions

### 6.2 Timer Operations
- **Start**: Initialize countdown with full SLA time
- **Pause**: Preserve remaining time, track pause duration
- **Resume**: Continue with preserved remaining time
- **Complete**: Stop timer, record total active time
- **Overdue**: Track time beyond SLA limit

### 6.3 Timer Display
- **Live Updates**: Real-time countdown display
- **Multiple Formats**: HH:MM:SS format for all timers
- **Status Indicators**: Visual indicators for timer state
- **Overdue Alerts**: Visual alerts when SLA exceeded

## 7. CONNECTIVITY & INTEGRATIONS

### 7.1 Task Management Integration
- **Bidirectional Sync**: Changes sync between daily_tasks and tasks
- **Status Mapping**: Consistent status across systems
- **Progress Sync**: Real-time progress updates
- **Completion Sync**: Completion triggers main task update

### 7.2 Follow-up System Integration
- **Task Completion**: Triggers follow-up status updates
- **Contact Sync**: Shared contact information
- **Status Propagation**: Task completion affects linked follow-ups

### 7.3 Notification System Integration
- **SLA Alerts**: Notifications for approaching deadlines
- **Completion Notifications**: Task completion alerts
- **Overdue Alerts**: Automatic overdue notifications
- **Daily Summaries**: End-of-day performance summaries

### 7.4 User Management Integration
- **Role-Based Access**: Different views for different roles
- **Permission Checks**: Action-level permission validation
- **User Preferences**: Customizable interface options

## 8. FORM VALIDATION & SECURITY

### 8.1 Client-Side Validation
- **Date Validation**: Proper date range enforcement
- **Progress Validation**: 0-100% range validation
- **Required Fields**: Progress description mandatory
- **Status Logic**: Automatic status updates based on progress

### 8.2 Server-Side Security
- **CSRF Protection**: Token validation on all AJAX requests
- **Permission Validation**: User ownership and role checks
- **Input Sanitization**: All inputs properly sanitized
- **SQL Injection Prevention**: Prepared statements throughout

### 8.3 Business Rule Validation
- **Date Logic**: Prevents invalid date operations
- **Status Transitions**: Validates logical status changes
- **SLA Constraints**: Ensures proper SLA calculations
- **Rollover Rules**: Validates rollover eligibility

## 9. USER INTERFACE FEATURES

### 9.1 Real-Time Updates
- **Live Timers**: JavaScript-based countdown timers
- **Status Indicators**: Real-time status badge updates
- **Progress Bars**: Dynamic progress visualization
- **SLA Alerts**: Visual overdue indicators

### 9.2 Responsive Design
- **Mobile Optimization**: Touch-friendly interface
- **Grid Layouts**: Responsive task card layouts
- **Progressive Enhancement**: Works without JavaScript
- **Accessibility**: Screen reader compatible

### 9.3 Interactive Elements
- **Modal Dialogs**: Progress update modals
- **Inline Forms**: Postpone date selection
- **Drag & Drop**: Future enhancement for task reordering
- **Keyboard Shortcuts**: Efficiency shortcuts for power users

## 10. API ENDPOINTS

### 10.1 Task Execution APIs
- **POST /ergon/workflow/start-task**: Start task execution
- **POST /ergon/workflow/pause-task**: Pause active task
- **POST /ergon/workflow/resume-task**: Resume paused task
- **POST /ergon/workflow/complete-task**: Complete task
- **POST /ergon/workflow/postpone-task**: Postpone task
- **POST /ergon/workflow/update-status**: Generic status update

### 10.2 Data Retrieval APIs
- **GET /ergon/workflow/get-timer**: Get current timer state
- **GET /ergon/workflow/get-tasks**: Get tasks for date
- **GET /ergon/workflow/get-history**: Get task history
- **GET /ergon/workflow/get-stats**: Get daily statistics

### 10.3 Management APIs
- **POST /ergon/workflow/manual-rollover**: Trigger manual rollover
- **POST /ergon/workflow/quick-add**: Quick task addition
- **GET /ergon/workflow/check-overdue**: Check overdue tasks

## 11. WORKFLOW PROCESSES

### 11.1 Daily Planner Access Workflow
1. User navigates to daily planner
2. Date validation and mode determination
3. Auto-rollover execution (if current date)
4. Task synchronization from main tasks
5. Statistics calculation
6. Interface rendering with appropriate controls
7. Real-time timer initialization

### 11.2 Task Execution Workflow
1. User clicks Start on task
2. Permission and status validation
3. SLA timer initialization
4. Status update to in_progress
5. Database transaction commit
6. UI update with timer display
7. History logging

### 11.3 Task Completion Workflow
1. User opens progress modal
2. Progress percentage and description input
3. Client-side validation
4. AJAX submission to server
5. Server-side validation and processing
6. Main task synchronization
7. Daily task status update
8. Performance metrics update
9. UI refresh with new status

### 11.4 Rollover Workflow
1. System detects eligible tasks (automated/manual)
2. Duplicate prevention checks
3. New task entry creation for current date
4. Original task status update to 'rolled_over'
5. Audit trail logging
6. Performance metrics update

## 12. PERFORMANCE OPTIMIZATIONS

### 12.1 Database Optimizations
- **Strategic Indexing**: Optimized indexes for common queries
- **Query Optimization**: Efficient JOIN operations
- **Connection Pooling**: Reused database connections
- **Batch Operations**: Bulk updates for rollover operations

### 12.2 Frontend Optimizations
- **Lazy Loading**: Load data on demand
- **Caching**: Browser caching for static resources
- **Debounced Updates**: Prevent excessive API calls
- **Efficient DOM Updates**: Minimal DOM manipulation

### 12.3 Real-Time Features
- **WebSocket Alternative**: Polling-based updates
- **Timer Optimization**: Efficient JavaScript timers
- **State Management**: Proper state synchronization
- **Memory Management**: Cleanup of inactive timers

## 13. ERROR HANDLING & LOGGING

### 13.1 Error Handling
- **Database Errors**: Graceful fallback with user messages
- **Validation Errors**: Clear, actionable error messages
- **Permission Errors**: Secure error responses
- **Timer Errors**: Automatic recovery mechanisms

### 13.2 Comprehensive Logging
- **Task Actions**: Complete audit trail for all actions
- **Timer Events**: SLA timer start/stop/pause events
- **System Events**: Error logging with full context
- **Performance Metrics**: Daily performance tracking
- **Rollover Events**: Complete rollover audit trail

## 14. BUSINESS RULES

### 14.1 Task Execution Rules
- **Single Active Task**: Only one task can be active per user
- **SLA Enforcement**: Automatic overdue detection and alerts
- **Status Progression**: Logical status transition validation
- **Progress Validation**: Progress must be between 0-100%

### 14.2 Rollover Rules
- **Eligibility Criteria**: Incomplete tasks from previous dates
- **Duplicate Prevention**: No duplicate rollovers allowed
- **Status Preservation**: Configurable status handling
- **Audit Requirements**: All rollovers must be logged

### 14.3 Date Access Rules
- **Historical Limit**: 90 days back access limit
- **Future Limit**: 30 days forward access limit
- **Current Date Priority**: Full functionality only on current date
- **Read-Only Past**: Historical dates are read-only

This comprehensive specification covers all aspects of ERGON's Daily Planner System, providing complete reference for development, maintenance, and integration with other system components.