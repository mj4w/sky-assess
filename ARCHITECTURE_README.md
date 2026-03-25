# SkyAssess Architecture and Flow

This document is the individual system-flow reference for SkyAssess. It covers:

- System Design
- Data Flow Diagram
- Use Case Diagram

The diagrams use Mermaid so they can be rendered in GitHub and Markdown viewers that support Mermaid.

## 1. System Design

SkyAssess is a role-based flight training platform built on:

- **Frontend:** Next.js 16 App Router
- **Backend Platform:** Supabase
- **Authentication:** Supabase Auth
- **Database:** Supabase PostgreSQL
- **Email Notifications:** Nodemailer + Gmail SMTP
- **Deployment:** Vercel

### 1.1 High-Level Architecture

```mermaid
flowchart LR
    A[Student] --> B[Next.js Web App]
    C[Instructor] --> B
    D[Flight Ops] --> B
    E[Admin] --> B

    B --> F[Supabase Auth]
    B --> G[Supabase Database]
    B --> H[API Routes]
    H --> I[Gmail SMTP / Nodemailer]

    G --> J[profiles]
    G --> K[student_info]
    G --> L[instructor_info]
    G --> M[flight_ops_assignments]
    G --> N[course_debriefs]
    G --> O[course_debrief_items]
    G --> P[student_instructor_feedback]
    G --> Q[user_navigation_guides]
```

### 1.2 Main Roles

- **Student**
  - Logs in
  - Views dashboard, tasks, performance, profile, debrief records
  - Submits lesson number
  - Evaluates instructors
  - Views completed debriefing

- **Instructor**
  - Views assigned students and schedule
  - Opens debriefing form
  - Submits PPL/CPL/IR/ME debrief records
  - Reviews evaluation feedback

- **Flight Ops**
  - Manages the flight calendar
  - Assigns student/instructor schedules
  - Edits unlocked schedules
  - Sends assignment notifications

- **Admin**
  - Manages personnel records
  - Assigns `admin` and `flightops` roles
  - Views instructor evaluation summaries

### 1.3 Core Tables

- `profiles`
  - identity, email, role, student/instructor IDs, flight hours
- `student_info`
  - student reference and student full name
- `instructor_info`
  - instructor reference and instructor full name
- `flight_ops_assignments`
  - daily aircraft schedule, student assignment, instructor assignment, lesson number
- `flight_ops_day_warnings`
  - aircraft maintenance / grounded state for a full day
- `course_debriefs`
  - master debrief record for PPL / CPL / IR / ME
- `course_debrief_items`
  - line-item grades and remarks per debrief
- `student_instructor_feedback`
  - anonymous student evaluation of instructors
- `student_self_assessments`
  - student self-rating for landings, takeoff, turns
- `user_navigation_guides`
  - stores guided-tour completion or skip state per page

## 2. Data Flow Diagram

### 2.1 Context-Level DFD

```mermaid
flowchart TD
    Student -->|Register / Login / Submit tasks / Evaluate / Review debrief| SkyAssess[SkyAssess System]
    Instructor -->|Review students / Submit debrief / View evaluations| SkyAssess
    FlightOps -->|Create schedules / Edit assignments / Notify crew| SkyAssess
    Admin -->|Manage roles / Manage records / View instructor metrics| SkyAssess

    SkyAssess -->|Auth requests| SupabaseAuth[Supabase Auth]
    SkyAssess -->|CRUD operations| SupabaseDB[Supabase Database]
    SkyAssess -->|Emails| EmailService[Gmail SMTP]
```

### 2.2 Level-1 DFD

```mermaid
flowchart TD
    A[Student] -->|Login / Open dashboard| B[Web App]
    B --> C[Supabase Auth]
    B --> D[profiles]
    B --> E[flight_ops_assignments]
    B --> F[course_debriefs]
    B --> G[course_debrief_items]
    B --> H[student_instructor_feedback]
    B --> I[student_self_assessments]

    J[Instructor] -->|Submit debrief| B
    B --> F
    B --> G

    K[Flight Ops] -->|Add / Edit assignment| B
    B --> E
    B --> L[flight_ops_day_warnings]
    B --> M[Email API Route]
    M --> N[Gmail SMTP]

    O[Admin] -->|Assign roles / Manage users| B
    B --> D
    B --> P[student_info]
    B --> Q[instructor_info]
```

### 2.3 Example Operational Flow: Flight Assignment to Debrief

```mermaid
sequenceDiagram
    participant FO as Flight Ops
    participant APP as SkyAssess App
    participant DB as Supabase DB
    participant MAIL as Email Service
    participant STU as Student
    participant INS as Instructor

    FO->>APP: Add flight assignment
    APP->>DB: Insert into flight_ops_assignments
    APP->>MAIL: Send assignment email
    MAIL-->>STU: Flight schedule notification
    MAIL-->>INS: Flight schedule notification

    STU->>APP: Submit lesson number
    APP->>DB: Update flight_ops_assignments.lesson_no

    INS->>APP: Open debrief course form
    APP->>DB: Insert course_debriefs
    APP->>DB: Insert course_debrief_items
    APP->>MAIL: Send debrief complete email

    STU->>APP: Open debrief record
    APP->>DB: Read course_debriefs + course_debrief_items
```

## 3. Use Case Diagram

```mermaid
flowchart LR
    Student((Student))
    Instructor((Instructor))
    FlightOps((Flight Ops))
    Admin((Admin))

    UC1[Register Account]
    UC2[Login]
    UC3[View Student Dashboard]
    UC4[Submit Lesson Number]
    UC5[View Debrief Record]
    UC6[Submit Self-Assessment]
    UC7[Evaluate Instructor]
    UC8[View Instructor Dashboard]
    UC9[Submit Debrief]
    UC10[View Evaluation Results]
    UC11[Manage Flight Schedule]
    UC12[Send Assignment Notification]
    UC13[Manage Personnel]
    UC14[Assign Roles]
    UC15[View Evaluation Directory]

    Student --> UC1
    Student --> UC2
    Student --> UC3
    Student --> UC4
    Student --> UC5
    Student --> UC6
    Student --> UC7

    Instructor --> UC2
    Instructor --> UC8
    Instructor --> UC9
    Instructor --> UC10

    FlightOps --> UC2
    FlightOps --> UC11
    FlightOps --> UC12

    Admin --> UC2
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
```

## 4. Role-Based Functional Flow

### 4.1 Student Flow

1. Student registers or logs in
2. Student opens dashboard
3. Student checks assigned flight schedule in `Tasks`
4. Student submits lesson number
5. Instructor completes debrief
6. Student receives debrief notification
7. Student reviews signed debrief record and PDF
8. Student submits self-assessment and instructor evaluation

### 4.2 Instructor Flow

1. Instructor logs in
2. Instructor views assigned students and today’s flights
3. Instructor waits for lesson number submission
4. Instructor opens course debrief form
5. Instructor grades items and signs
6. Debrief is saved to `course_debriefs` and `course_debrief_items`
7. Student is notified that debrief is completed

### 4.3 Flight Ops Flow

1. Flight Ops logs in to `/flight-ops`
2. Flight Ops selects date and aircraft row
3. Flight Ops creates or edits assignment if `lesson_no` is still null
4. System saves `flight_ops_assignments`
5. Optional email notification is sent to student and instructor
6. If aircraft is unavailable, Flight Ops adds whole-day warning

### 4.4 Admin Flow

1. Admin logs in
2. Admin manages student and instructor records
3. Admin assigns elevated roles (`admin`, `flightops`)
4. Admin opens evaluation directory
5. Admin reviews instructor-specific evaluation results

## 5. Design Notes

- IDs are normalized to lowercase in matching logic where applicable.
- Flight Ops editing is locked once `lesson_no` is filled.
- Student and instructor dashboards are role-restricted.
- Guided tours are stored per user and per page in `user_navigation_guides`.
- Shared debrief storage supports:
  - `PPL`
  - `CPL`
  - `IR`
  - `ME`

## 6. Recommended Diagram Usage

For documentation or defense, use:

- **System Design** for architecture explanation
- **Data Flow Diagram** for showing movement of data between users, app, and database
- **Use Case Diagram** for actor responsibilities and system scope

If needed, this file can be extended with:

- ER diagram
- deployment diagram
- sequence diagrams per module
- role-permission matrix
