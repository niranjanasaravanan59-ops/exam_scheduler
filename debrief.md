# Prompt-to-Production Note (debrief.md)

## 1. Which AI output misled you most?

The AI initially suggested using `sequelize.sync({ alter: true })` as an acceptable development practice that could be "cleaned up later." This was misleading because:
- It obscures the actual schema state — the DB becomes the source of truth, not the codebase
- `alter: true` can silently DROP columns when a model field is removed
- It creates no audit trail of schema changes
- It breaks CI pipelines where the DB starts empty and the app is expected to set it up predictably

The AI framed this as a minor convenience issue rather than a fundamental reliability problem.

## 2. How did you detect it?

During a staging deploy where the DB user had limited privileges (no ALTER TABLE permission), the server crashed on startup. Tracing the error revealed `sequelize.sync` was being called and failing silently before crashing. This forced a proper review of the startup sequence and exposed the underlying risk.

Additionally, reviewing the Sequelize docs for `sync({ alter: true })` found the explicit warning: *"This will also drop any index or constraint that was added manually to the database."*

## 3. What did you verify manually?

- Confirmed that removing `sequelize.sync` entirely and relying on migrations produced identical table structures to what `sync` had been generating
- Verified the migration order: `users` must be created before `exams` (FK `facultyId → users.id`) and `exams` before `results` (FK `examId → exams.id`)
- Manually tested the clash detection SQL with overlapping time windows at the boundary (e.g., exam A ends at 11:00 and exam B starts at 11:00 — should NOT clash)
- Confirmed that grade was truly never accepted from the client by sending a `grade` field in a POST /results request — the validator correctly rejected it
- Verified the concurrency conflict returns `currentData` in the response body (needed for the Compare Versions UI)
- Manually tested the tripwire by temporarily setting an exam's `examDate` to tomorrow and confirming marks entry returned 403

## 4. What would you improve with another day?

1. **Real-time notifications** — Use WebSockets (Socket.io) to notify faculty when their exam result is published, or notify students when results become available
2. **MySQL FULLTEXT search** — Replace `LIKE '%query%'` with FULLTEXT indexes on `subject`, `name` for proper search performance at scale
3. **Redis for metrics** — The in-memory metrics store resets on server restart; move it to Redis for persistence across deploys
4. **Refresh token rotation** — Currently refresh tokens don't rotate on use; add a rotation + blacklist mechanism
5. **E2E seeded test data** — The Playwright tests rely on live data in the DB; better to use a seeded test DB with fixed UUIDs for deterministic UI tests
6. **Pagination UI** — The frontend fetches paginated data but doesn't render the pagination controls yet; add page navigation components
7. **Audit log viewer** — Add an admin UI page to search/filter the structured audit logs from Winston
