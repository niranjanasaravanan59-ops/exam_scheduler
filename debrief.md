# Prompt-to-Production Note (debrief.md)

## 1. Which AI output misled you most?

**The clash detection using `Op.between`.**

When asked to implement time-overlap detection for exam scheduling, the AI generated:

```js
startTime: { [Op.between]: [newStartTime, newEndTime] }
```

This looked correct at first glance — it checks whether an existing exam's start time falls within the new exam's window. But it is wrong in two distinct ways:

1. **False negatives:** If an existing exam starts *before* the new exam but ends *during* it (a partial tail overlap), `Op.between` won't catch it because the existing exam's `startTime` is outside `[newStart, newEnd]`.

2. **False positives at boundaries:** `BETWEEN` is inclusive. Back-to-back exams (A ends at 11:00, B starts at 11:00) would be flagged as a clash even though they don't overlap.

The correct half-open interval condition is:
```js
startTime: { [Op.lt]: newEndTime },
endTime:   { [Op.gt]: newStartTime },
```

This is the standard interval overlap predicate: two intervals `[s1, e1)` and `[s2, e2)` overlap iff `s1 < e2 AND e1 > s2`.

The AI's answer was *plausible*-looking and passed a superficial review because the happy-path test (two fully overlapping exams) would still catch a clash. It's the partial-overlap and boundary cases that silently fail.

---

## 2. How did you detect it?

Two paths converged:

**Path 1 — Manual boundary test:**
While writing the unit tests for clash detection, a test case was added for back-to-back exams (A: 09:00–11:00, B: 11:00–13:00). This should return no clash. With `Op.between`, it returned a clash. The test failed, which triggered a review of the SQL condition.

**Path 2 — Reading Sequelize docs:**
Cross-checking the Sequelize `Op.between` documentation confirmed it maps to `BETWEEN a AND b` in MySQL, which is `>= a AND <= b` — inclusive on both ends. The overlap condition requires strict inequalities.

This is a case where the AI generated code that is subtly wrong in a way that only surfaces on edge cases. Smoke tests would miss it; boundary tests caught it.

---

## 3. What did you verified manually?

**Clash detection boundaries:**
Ran six SQL-level unit tests covering: full overlap, partial start overlap, containment, back-to-back (should NOT clash), non-overlapping earlier, non-overlapping later. Confirmed the half-open interval condition handles all six correctly.

**Grade computation independence:**
Sent a `POST /api/results` request with `{ marks: 70, grade: "O" }` and verified the response returned `grade: "A"` (correct server-computed value for 70), not `"O"`. Confirmed the `beforeValidate` hook strips the client-submitted grade.

**Concurrency atomic update:**
Verified the `UPDATE results SET marks=?, version=? WHERE id=? AND version=?` query by inspecting the MySQL general query log. Confirmed the `WHERE version = ?` clause is present and that a stale version causes 0 rows affected (which triggers the 409 response).

**Migration order:**
Manually checked that `users` migration runs before `exams` (FK `facultyId → users.id`) and `exams` before `results` (FK `examId → exams.id`). Verified by running `npx sequelize-cli db:migrate` on a blank DB and confirming all tables created without FK errors.

**Tripwire — server enforced:**
Bypassed the frontend by sending a `POST /api/results` with `Authorization: Bearer <faculty_token>` for a future exam via cURL. Confirmed the server returned `403 EXAM_NOT_COMPLETED` regardless of the UI state.

**Student result visibility:**
Confirmed that `GET /api/results?studentId=X` for a student token always appends `status: 'published'` in the Sequelize `where` clause. Verified by checking the query log — draft results are never returned to the student role.

**Idempotent CSV import:**
Uploaded `sample_results.csv` twice consecutively and verified `report.imported` was 52 on the first call and 0 on the second (all 52 rows skipped as duplicates). Checked the DB row count directly to confirm no duplicates.

---

## 4. What would you improve with another day?

1. **Real-time result notifications via WebSockets** — When a result is published, the student currently has to refresh to see it. Socket.io push notifications would make this instant and remove the need for polling.

2. **MySQL FULLTEXT search** — All search queries use `LIKE '%term%'` which performs a full table scan. Adding FULLTEXT indexes on `subject` and `name` columns would make search viable at 10,000+ row scale.

3. **Redis for metrics persistence** — The in-memory metrics store (`metricsStore.js`) resets every time the server restarts or crashes. Moving it to Redis with TTL-based expiry would make the `/metrics` endpoint meaningful across deployments.

4. **Refresh token rotation + blacklist** — The current refresh token implementation issues a long-lived token (7 days) with no rotation. A stolen refresh token is valid until expiry. Adding rotation (each use issues a new token, invalidates the old) plus a Redis blacklist for logged-out tokens would close this gap.

5. **Pagination UI controls** — The API supports cursor-based pagination (`page`, `limit` query params) but the frontend never renders page navigation controls. Users are silently capped at the default page size with no way to go further.

6. **Seeded test database for Playwright** — The Playwright UI tests currently run against whatever data is in the live dev DB. This makes them non-deterministic (a future exam might not exist, a faculty user might be deactivated). A dedicated test DB seeded with fixed UUIDs would make UI tests fully deterministic.

7. **Admin audit log viewer** — Structured audit logs are written to Winston (with `actor_id`, `resource_id`, `action`, `status`, `latency`), but there is no UI to query them. An admin page with date + actor + action filters would close the observability loop.
