# Prompt Receipts

## Receipt 1

Timestamp: 2026-06-07 20:40 IST

Prompt: "This is my requirement for this project... ensure all requirements and features must contain... bulk import should be faculty side dashboard... give final zip file... check all API, frontend and backend."

AI response (trimmed): "I'll start by reading the uploaded zip file to understand the current state of the project, then systematically fix all issues."

Accepted decisions: Audit the project against the assignment before packaging.

Rejected decisions: None.

Reasoning: The request was broad and high-stakes, so a checklist-based audit was needed before editing.

## Receipt 2

Timestamp: 2026-06-07 20:41 IST

Prompt: "Identify all missing or broken Assignment 3 requirements."

AI response (trimmed): "Bulk Import is on admin side; faculty nav doesn't have Bulk Import; faculty marks page calls an admin-only users route; no FacultyImport page exists."

Accepted decisions: Move Bulk Import to faculty, create a faculty import page, and let faculty list students only.

Rejected decisions: Keeping Bulk Import in admin UI.

Reasoning: The user clarified Bulk Import must be on the faculty side.

## Receipt 3

Timestamp: 2026-06-07 20:42 IST

Prompt: "hey wait 6 remove"

AI response (trimmed): "Do you mean remove Bulk Import from the admin side, or requirement #6 Dashboard KPIs?"

Accepted decisions: Clarify the ambiguous "6 remove" instruction.

Rejected decisions: Removing Dashboard KPIs.

Reasoning: Dashboard KPIs are explicitly required by Assignment 3; the later "yes" confirmed admin-side Bulk Import removal.

## Receipt 4

Timestamp: 2026-06-07 20:45 IST

Prompt: "Fix faculty marks entry."

AI response (trimmed): "Faculty marks calls `/auth/users?role=student`, but that route is admin-only."

Accepted decisions: Change the route to allow faculty, with server-side restriction to students only.

Rejected decisions: Making `/auth/users` public or fully faculty-accessible.

Reasoning: Faculty need student rows for marks entry, but should not see admin/faculty account lists.

## Receipt 5

Timestamp: 2026-06-07 20:50 IST

Prompt: "Make bulk import correct."

AI response (trimmed): "Allow admin and faculty to import because both can manage results."

Accepted decisions: Reuse the CSV parsing and idempotent `findOrCreate` approach.

Rejected decisions: Admin import access.

Reasoning: This AI suggestion was wrong for the clarified requirement. Bulk import was moved to faculty only, and the API now checks that the exam is assigned to the importing faculty.

## Receipt 6

Timestamp: 2026-06-07 20:55 IST

Prompt: "Check for disqualification risks."

AI response (trimmed): "Hardcoded credentials can cause disqualification."

Accepted decisions: Remove database password fallback from `server/config/db.js` and replace `.env.example` secrets with placeholders.

Rejected decisions: Shipping real-looking default credentials.

Reasoning: The rubric explicitly lists hardcoded credentials as a disqualification condition.

## Receipt 7

Timestamp: 2026-06-07 21:00 IST

Prompt: "Improve demo data and import sample."

AI response (trimmed): "Create a stable completed exam id and 50 student rows so the sample CSV works after seeding."

Accepted decisions: Seed 50 students, stable exam IDs, completed/upcoming exams, and a 50-row sample CSV.

Rejected decisions: Placeholder exam IDs in sample CSV.

Reasoning: A reviewer should be able to seed the DB and immediately try the import flow.

