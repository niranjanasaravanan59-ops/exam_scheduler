# AI Audit Log

| Task | AI Used | Accepted | Modified | Rejected | Why |
| --- | --- | --- | --- | --- | --- |
| Break down Assignment 3 requirements | ChatGPT/Codex | Requirement checklist by role and feature area | Grouped items into backend, frontend, tests, and docs | None | The assignment had many reliability requirements, so decomposition reduced missed items. |
| Build schedule clash detection | AI assistant | Time-overlap rule: `existing.start < new.end AND existing.end > new.start` | Implemented with Sequelize operators instead of raw string SQL | Unsafe raw-literal approach | Raw string SQL was more error-prone and depended on column naming. |
| Implement result grading | AI assistant | Server-side grade thresholds | Added validation to reject client-submitted grade | Client-side grade trust | Requirement says grade must never be trusted from the client. |
| Add optimistic concurrency | AI assistant | Version column and `409 CONCURRENCY_CONFLICT` shape | Added `currentData` for compare/retry UI | Silent overwrite behavior | Stale updates must be rejected and visible in UI. |
| Place Bulk Import feature | Claude/Codex | Faculty-side dashboard/nav/page | Removed admin route/page and made API faculty-only | Admin-side bulk import | User clarified Bulk Import must be faculty-side only. |
| Fix faculty student lookup | Codex | Faculty needs a student list for marks entry | Backend now lets faculty list students only | Admin-only `/auth/users` route | Faculty marks page could not work with an admin-only student list route. |
| Prepare demo seed data | Codex | Seed users, exams, and result states | Increased students to 50 and created stable exam IDs | User-only seed data | Bulk import and dashboards need real demo data after seeding. |
| Remove hardcoded credentials | Codex | Keep credentials in `.env` only | Updated `.env.example` to placeholders | DB password fallback in code | Assignment disqualifies hardcoded credentials. |

