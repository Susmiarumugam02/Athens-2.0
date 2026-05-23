# Safety Observation Feature Documentation

## Overview
The Safety Observation feature is a comprehensive module designed to facilitate the reporting, tracking, and management of safety observations within a project. It provides users with tools to create new safety observations, view detailed logs and statistics, manage observation statuses, and collaborate on corrective actions. The feature emphasizes user roles and permissions to ensure data integrity and accountability.

## Key Components

### 1. SafetyObservation.tsx
- **Role:** Main dashboard component for the Safety Observation feature.
- **Functionality:** 
  - Displays a dark-themed dashboard with cards for different views:
    - Safety Observation Form
    - Observation Log (charts and statistics)
    - My Observation List
    - Safety Observation List (modal)
  - Manages state for selected views, modal visibility, and observation data.
  - Handles user session verification and redirects to login if expired.
  - Fetches observation data based on URL parameters.
  - Uses Ant Design and styled-components for UI, and Framer Motion for animations.

### 2. SafetyObservationForm.tsx
- **Role:** Form component for creating and editing safety observations.
- **Functionality:**
  - Provides a detailed form with fields such as Observation ID, Date, Time, Department, Contractor, Observation Details, Status, and file uploads for before/after pictures.
  - Handles form validation, file upload restrictions, and date/time formatting.
  - Manages user permissions for editing based on roles (reporter, assigned person).
  - Supports commitment date updates and status changes with confirmation dialogs.
  - Sends notifications on key actions (new assignment, commitment update, observation closed, etc.).
  - Integrates with backend APIs for data fetching and submission.

### 3. ObservationLog.tsx
- **Role:** Dashboard component displaying charts and statistics about safety observations.
- **Functionality:**
  - Fetches all safety observations and aggregates data by date, department, company, type, classification, and status.
  - Displays multiple charts (bar, pie, line) using the Recharts library.
  - Provides a visual summary for analysis and monitoring of safety observations.

### 4. SafetyObservationList.tsx
- **Role:** Table component listing all safety observations.
- **Functionality:**
  - Fetches and displays observations in a sortable, filterable, and paginated table.
  - Allows viewing details in a modal.
  - Supports editing and deleting observations with permission checks.
  - Uses styled-components for styling and Ant Design for UI elements.
  - Navigates to edit or view pages using React Router.

### 5. SafetyObservationEdit.tsx
- **Role:** Page component for editing a specific safety observation.
- **Functionality:**
  - Fetches observation data by ID.
  - Checks user permissions (reporter or assigned person) before allowing edits.
  - Displays loading state and redirects if no permission or observation not found.
  - Renders the `SafetyObservationForm` with existing data for editing.

### 6. SafetyObservationView.tsx
- **Role:** Page component for viewing a safety observation in read-only mode.
- **Functionality:**
  - Fetches observation data by ID.
  - Displays detailed information in a card with sections for basic info, observation details, and responsibility.
  - Shows status with colored tags.
  - Allows navigation back to the list and editing if permitted.
  - Displays loading state and redirects if observation not found.

## User Roles and Permissions
- **Reporter:** The user who creates the observation. Can edit and delete their own observations.
- **Assigned Person:** The user assigned to take corrective action. Can update commitment dates, upload after pictures, and update status.
- **Others:** Can view observations but cannot edit or delete.

## API Integration
- The feature interacts with backend APIs under `/api/v1/safetyobservation/` for CRUD operations.
- Additional APIs are used to fetch user lists, contractors, and send notifications.
- File uploads for before and after pictures are handled via multipart form data.

## Libraries and Tools Used
- **React** for UI components.
- **Ant Design** for UI elements and form controls.
- **styled-components** for CSS-in-JS styling.
- **Recharts** for data visualization in ObservationLog.
- **Framer Motion** for animations in the main dashboard.
- **Axios** for API requests.
- **Moment.js** for date and time formatting.
- **React Router** for navigation.

## Component Interaction Flow
- The main dashboard (`SafetyObservation.tsx`) allows users to navigate between different views.
- Creating or editing an observation is done via `SafetyObservationForm.tsx`, either embedded in the dashboard or on separate edit pages.
- The list view (`SafetyObservationList.tsx`) provides an overview and access to individual observations.
- Detailed viewing and editing are handled by `SafetyObservationView.tsx` and `SafetyObservationEdit.tsx` respectively.
- The `ObservationLog.tsx` provides analytical insights through charts.

## Styling and Theming
- The feature uses a dark theme palette in the main dashboard with styled-components.
- Cards and modals are styled for a modern, clean look.
- Charts use vibrant color palettes for clarity and visual appeal.

---

This documentation provides a comprehensive overview of the Safety Observation feature, its components, and their interactions. It serves as a guide for developers and maintainers to understand and extend the feature effectively.
