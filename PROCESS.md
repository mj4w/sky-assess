# SkyAssess Implementation Process

This document summarizes the major process and feature work completed in this project.

## 1) Identity and Registration Flow

- Registration checks `student_id`/`instructor_id` against:
  - `student_info`
  - `instructor_info`
- Registration only proceeds if ID exists in the correct master table.
- Login and registration ID matching are normalized to lowercase to reduce case-sensitivity issues.
- Added first-time ID update flow (modal) for student/instructor before continuing to dashboard.

## 2) Role-Based Routing and Access

- Role routing after login:
  - `admin` -> `/dashboard/admin`
  - `flightops` -> `/flight-ops`
  - `student`/`instructor` -> `/dashboard/[role]/[id]`
- Restricted access to feature pages by role (student/instructor/flightops/admin where needed).
- Updated admin guard behavior so `flightops` is redirected correctly to `/flight-ops`.

## 3) Flight Operations Scheduling

- Implemented and integrated `flight_ops_assignments` and day warnings workflow.
- Added scheduling logic with slot/time handling and drag-related updates.
- Enabled assignment-level use in downstream flows (tasks, debriefing, notifications).
- Added flight-ops logout and role-based protection.

## 4) Notifications

- Dashboard bell notifications added for student/instructor assignment flows.
- Instructor notification rule updated: show “ready for debrief” only when `lesson_no` is present.
- Notification read state integrated via:
  - `notification_read_student`
  - `notification_read_instructor`
- Added handling to mark notifications as read on click without deleting core records.

## 5) Student Task and Lesson Number Flow

- Added `/dashboard/tasks` flow for student assignment checklist.
- Student can submit `lesson_no` tied to assignment.
- If `lesson_no` already exists, save action is hidden/disabled and value is shown.
- Task access restricted to student role.

## 6) Debriefing System (PPL/CPL)

- Debrief UI flow connected from dashboard notifications and instructor actions.
- PPL/CPL forms updated for role-based input behavior (student vs instructor editable fields).
- Added assignment-based status handling to avoid collisions when student has multiple flights.
- Added instructor signature requirement before submit in debrief courses.
- Standardized submit/cancel button style across courses.
- Debrief completion state reflected in instructor dashboard and list behavior.

## 7) Debrief Record and Student Signature + PDF

- Added student-side debrief record viewing with signature and download workflow.
- Integrated PDF generation and formatting updates.
- Addressed PDF rendering issues (unsupported color function errors).
- Fixed signature capture clarity and persistence issues.
- Added debrief-complete email flow and record redirection handling.

## 8) Instructor Dashboard Redesign

- Reworked instructor-facing dashboard using `/dashboard/profiles` style and grouped schedule view.
- Added date pagination and schedule slot pagination.
- Added per-student debrief action and completion indicators.
- Added “today” highlight and status-focused presentation for ease of use.

## 9) Instructor Evaluation (Student -> Instructor)

- Built student instructor-evaluation workflow with detailed rating sections and narrative feedback.
- Added anonymous instructor evaluation view for instructors.
- Added notify indicator behavior for new evaluations.
- Added no-spam constraints/logic refinements and remaining-count logic improvements.
- Updated rule: if no scheduled flight today, required evaluations become 0 and submission is disabled.

## 10) Self-Assessment / Performance

- Added student self-assessment workflow and monthly progress visualization.
- Updated grading scale alignment to aviation grading style.
- Iterated chart design for readability and professional UI.
- Added real-time refresh behavior after submission.

## 11) Admin Enrollment and Role Management

- Built admin personnel management page:
  - add/edit/delete instructors
  - add/edit/delete students
  - assign role by email (`admin` / `flightops`)
- Added role assignment messaging:
  - email not found
  - already same role
  - role changed successfully
- Added separate admin and flightops role lists in UI.

## 12) Email Notifications

- Integrated email sending for reminders and debrief completion using API routes.
- Supported Gmail/Nodemailer configuration via environment variables.
- Added notify toggles/flags to prevent repeated sends when not needed.

## 13) Theme System (Light/Night)

- Added global theme initialization and persistence (`localStorage`).
- Added header settings toggle for Light/Night mode.
- Applied broad dark-mode overrides and page-level dark styling adjustments.
- Fixed contrast/readability issues in highlighted cards and schedule sections.

## 14) Branding, Routing, and Production Setup

- App title updated to `SkyAssess`.
- Added airplane app icon.
- Root route `/` now redirects to `/register`.
- Added production-ready baseline:
  - security headers in `next.config.ts`
  - robots + sitemap
  - `.env.example`
  - deployment checklist in `README.md`

## 15) Deployment Target (Free Tier)

- Recommended stack:
  - Frontend: Vercel Free
  - Database/Auth: Supabase Free
- Required env setup documented.
- Post-deploy verification process documented (auth, role routing, notifications, debrief, evaluation).

---

## Current Operational Notes

- If profile rows are missing in admin role assignment, verify `profiles` RLS policy behavior.
- For reliable admin role management at scale, consider handling privileged profile updates via server route + service key.
- Ensure `NEXT_PUBLIC_APP_URL` is set to production URL for correct links in emails/sitemap/robots.
