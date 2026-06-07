# Exam Scheduler & Results Publisher

Full-stack examination scheduler and results publisher for a college with Admin, Faculty, and Student roles.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Redux Toolkit, React Router |
| UI | Tailwind CSS, Recharts |
| Backend | Node.js, Express |
| Database | MySQL 8, Sequelize ORM, sequelize-cli migrations |
| Auth | JWT access tokens and refresh tokens |
| Tests | Jest, Supertest, Playwright |

## Project Structure

```text
exam-scheduler/
  README.md
  AI_AUDIT_LOG.md
  PROMPT_RECEIPTS.md
  debrief.md
  schema.sql
  client/
    src/
      components/
      features/
      hooks/
      pages/
  server/
    config/
    database/migrations/
    middleware/
    modules/
    scripts/
    tests/
```

## Core Features

- Authentication with `admin`, `faculty`, and `student` roles.
- Admins create, update, delete, and view exam schedules.
- Faculty can view assigned exams, enter marks for assigned completed exams, and bulk import result CSV files.
- Students can view exam schedules and only published results.
- Server-side clash detection prevents overlapping exams for the same department and semester.
- Server-side grade calculation: `90+ = O`, `75+ = A+`, `60+ = A`, `50+ = B`, `40+ = C`, below `40 = F`.
- Version-based optimistic concurrency for exams and results with UI options to reload, retry, or compare versions.
- Result workflow: `draft -> ready -> published`; only Admin can publish.
- Faculty tripwire: the server rejects marks entry before the exam end time, and the UI shows a lockout message.
- Server-computed dashboard KPIs for all roles.
- Search and filtering for subject, exam date, student name, department, semester, and result status.
- Local draft recovery for faculty marks entry.
- Structured audit logs and `/metrics` endpoint.

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8+

### 1. Database

```bash
mysql -u root -p -e "CREATE DATABASE exam_scheduler CHARACTER SET utf8mb4;"
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials and long random JWT secrets.
npm install
npm run migrate
npm run seed:run
npm start
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo Credentials

After `npm run seed:run`:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@college.edu` | `Admin@1234` |
| Faculty | `ramesh@college.edu` | `Faculty@1234` |
| Student 1 | `student1@college.edu` | `Std@1` |
| Student 2-50 | `student{number}@college.edu` | `Std@{number}` |

The seed creates 50 hardcoded manual-test students (`Student 1` to `Student 50`) and resets their passwords each time `npm run seed:run` is executed. The full list is in `server/scripts/manual_test_credentials.csv`.

For time-condition checks, the seed includes:

- Completed import exam: `11111111-1111-4111-8111-111111111111`, assigned to `ramesh@college.edu`, accepts marks/imports.
- Future locked exam: `22222222-2222-4222-8222-222222222222`, assigned to `ramesh@college.edu`, should reject marks because the exam has not ended.
- Published demo exam: `33333333-3333-4333-8333-333333333333`, has 50 seeded results across `published`, `ready`, and `draft`.

The CSV at `server/scripts/sample_results.csv` is ready for the seeded faculty import flow.

## API Summary

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/register` | Public/Admin | Register user |
| GET | `/api/auth/me` | Authenticated | Current user |
| GET | `/api/auth/users` | Admin/Faculty | Admin lists users; Faculty lists students only |
| GET | `/api/exams` | All roles | Role-scoped schedule list |
| POST | `/api/exams` | Admin | Create exam |
| PUT | `/api/exams/:id` | Admin | Update exam with version check |
| DELETE | `/api/exams/:id` | Admin | Soft delete exam |
| GET | `/api/results` | All roles | Role-scoped result list |
| POST | `/api/results` | Admin/Faculty | Create result |
| PUT | `/api/results/:id` | Admin/Faculty | Update result with version check |
| PATCH | `/api/results/:id/transition` | Admin/Faculty | Draft/ready workflow; Admin only for publish |
| POST | `/api/results/exam/:examId/publish` | Admin | Publish all ready results for an exam |
| GET | `/api/import/template` | Faculty | Download CSV template |
| POST | `/api/import/results` | Faculty | Bulk import result CSV |
| GET | `/api/dashboard` | All roles | Role-specific KPIs |
| GET | `/metrics` | Public/Internal | Operation metrics |

## Bulk Import

Bulk result import is intentionally on the Faculty side only:

- UI route: `/faculty/import`
- API route: `POST /api/import/results`
- Required CSV columns: `exam_id, roll_no, marks`
- Faculty can import only for assigned exams.
- The exam must be completed.
- Students and exams must exist.
- Duplicate `(studentId, examId)` rows are skipped, so re-uploading the same file is idempotent.

## Search Approach

Search and filtering are implemented with Sequelize/MySQL queries:

- Subject search: `LIKE '%subject%'`
- Student name search: joined `users.name LIKE '%name%'`
- Exam date search: exact `examDate = YYYY-MM-DD`
- Department, semester, and result status use exact filters or scoped `LIKE` filters.

This is simple and transparent for the assignment. For large production data, replace leading-wildcard `LIKE` searches with MySQL FULLTEXT indexes or a search engine.

## Concurrency

`exams` and `results` both have a `version` column. Updates must send the current version. If stale, the API returns:

```json
{
  "error": {
    "code": "CONCURRENCY_CONFLICT",
    "message": "Result was modified by another user. Please reload.",
    "currentVersion": 2,
    "yourVersion": 1,
    "options": ["RELOAD_LATEST", "RETRY_CHANGES", "COMPARE_VERSIONS"]
  }
}
```

The UI displays actions for Reload Latest, Retry Changes, and Compare Versions.

## Draft Recovery

Faculty marks entry uses `localStorage` to restore:

- selected exam
- active student/result entry
- unsaved marks and remarks

Limitations:

- drafts are local to the browser
- drafts share the browser storage quota
- drafts are cleared after successful save or logout

## Observability

Structured audit logs include `actor_id`, `resource_id`, `action`, `status`, and `latency` for schedule and result operations.

`GET /metrics` returns operation counts, average latency, and p95 latency.

## Tests

```bash
cd server
npm test
```

UI tests require the backend and frontend dev servers:

```bash
cd server
npm run test:ui
```

Required test artifacts are included for:

- exam clash detection
- optimistic concurrency conflict path
- faculty tripwire before exam completion

## AI Deliverables

- `AI_AUDIT_LOG.md`
- `PROMPT_RECEIPTS.md`
- `debrief.md`

These cover the AI audit log, prompt receipts, and prompt-to-production note required by the assignment.
