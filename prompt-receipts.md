# Prompt Receipts — Examination Scheduler & Results Publisher

---

## Receipt 1

**Timestamp:** 2026-06-06 14:12 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> I'm building an exam scheduling system in Node.js + Express + Sequelize + MySQL. I need the project folder structure with auth, exam, result, dashboard, metrics, and bulk import modules. Each module should own its own model, controller, and routes file. Give me the initial scaffold.

**AI Response (trimmed):**
```
exam-scheduler/
  server/
    config/          # db.js, logger.js, sequelize-config.js
    middleware/      # authMiddleware.js, errorMiddleware.js
    modules/
      auth/          # authModel.js, authController.js, authRoutes.js
      exam/          # examModel.js, examController.js, examRoutes.js
      result/        # resultModel.js, resultController.js, resultRoutes.js
      dashboard/     # dashboardController.js, dashboardRoutes.js
      metrics/       # metricsStore.js, metricsController.js, metricsRoutes.js
      bulkImport/    # importController.js, importRoutes.js
    index.js
    package.json
  client/
    src/
      features/      # Redux slices
      pages/         # admin/, faculty/, student/
      components/    # shared/, layout/
    package.json
```
AI also generated a complete `index.js` that called `sequelize.sync({ alter: true })` on startup.

**Accepted decisions:**
- Modular folder structure — clean separation of concerns per module.
- Separate `config/` directory for DB, logger, and Sequelize config.
- `middleware/` directory for cross-cutting concerns.

**Rejected decisions:**
- `sequelize.sync({ alter: true })` in `index.js` — this silently drops columns when model fields are removed and obscures schema state. Replaced with proper Sequelize migrations.

**Reasoning:** The scaffold was directionally correct. The `sync` call is a trap: it works in a local dev happy-path but fails on restricted DB users and creates no audit trail of schema changes.

---

## Receipt 2

**Timestamp:** 2026-06-06 16:30 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> Write the Sequelize model for `Result`. Fields: id (UUID PK), studentId (FK → users), examId (FK → exams), marks (DECIMAL 5,2), grade (ENUM), status (draft/ready/published), version (INTEGER for OCC), enteredBy, publishedBy, publishedAt, importBatch (for idempotency). Grade must ALWAYS be computed server-side — never accepted from client. Use a Sequelize hook.

**AI Response (trimmed):**
```js
hooks: {
  beforeCreate: (result) => {
    result.grade = computeGrade(result.marks);
  },
  beforeUpdate: (result) => {
    if (result.changed('marks')) {
      result.grade = computeGrade(result.marks);
    }
  },
},
```
Grade computation in two separate hooks; `grade` column given a DB default of `'F'`.

**Accepted decisions:**
- Server-side grade computation logic — correct approach.
- `importBatch` field for idempotency.
- `version` field for OCC.

**Modified decisions:**
- Merged two hooks into one `beforeValidate` hook — fires before both create and update, and before Sequelize's own `allowNull` check, which means a missing grade never reaches the validator.
- Removed the DB-level `'F'` default — it allows NULL marks to silently receive a grade.

**Rejected decisions:**
- Separate `beforeCreate` / `beforeUpdate` hooks.

**Reasoning:** `beforeValidate` is the earliest hook and runs on both create and update paths. Using two separate hooks risks the `allowNull: false` validator on `grade` firing before the grade is set if Sequelize hook ordering changes.

---

## Receipt 3 *(AI was wrong here)*

**Timestamp:** 2026-06-06 18:05 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> Write the clash detection SQL using Sequelize Op for exams. Two exams clash if they are in the same department + semester + date and their time windows overlap. Also handle the boundary case: exam A ends at 11:00, exam B starts at 11:00 — this should NOT be a clash.

**AI Response (trimmed):**
```js
const where = {
  examDate,
  department,
  semester,
  startTime: { [Op.between]: [startTime, endTime] },
};
```
AI used `Op.between` claiming it handles the overlap correctly.

**Why the AI was wrong:**
`Op.between` checks whether `existing.startTime` falls inside `[newStart, newEnd]` — this is NOT the correct overlap condition. It misses the case where the new exam starts inside an existing exam's window. The correct half-open interval condition is:
- `existing.startTime < newEnd` AND `existing.endTime > newStart`

This also correctly excludes back-to-back exams (A ends 11:00, B starts 11:00 → `11:00 < 11:00` is false → no clash), which `Op.between` (inclusive) would have incorrectly flagged.

**Accepted decisions:**
- None from this response.

**Rejected decisions:**
- `Op.between` approach — produces false positives on back-to-back exams and false negatives on partial overlaps where new exam starts before existing start.

**Corrected implementation:**
```js
startTime: { [Op.lt]: endTime },
endTime:   { [Op.gt]: startTime },
```
Added six unit tests to document all boundary cases.

---

## Receipt 4

**Timestamp:** 2026-06-07 10:20 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> Write the optimistic concurrency check for PUT /api/results/:id. If the incoming version doesn't match the DB version, return 409 with error code CONCURRENCY_CONFLICT, the current version, the submitter's version, the options array (RELOAD_LATEST, RETRY_CHANGES, COMPARE_VERSIONS), and the full currentData object. If version matches, increment version in the UPDATE query itself.

**AI Response (trimmed):**
```js
const result = await Result.findByPk(id);
if (result.version !== parseInt(version)) {
  return res.status(409).json({
    error: {
      code: 'CONCURRENCY_CONFLICT',
      message: 'This record was modified by another user',
      currentVersion: result.version,
      yourVersion: parseInt(version),
    }
  });
}
result.version += 1;
result.marks = marks;
await result.save();
```
AI omitted the `options` array and `currentData` from the 409 body, and used `result.save()` which is susceptible to a TOCTOU race.

**Accepted decisions:**
- `findByPk` + version comparison pattern.
- 409 status with `CONCURRENCY_CONFLICT` code.

**Modified decisions:**
- Added `options: ['RELOAD_LATEST', 'RETRY_CHANGES', 'COMPARE_VERSIONS']` and `currentData` to the 409 response body — required by assignment spec and needed for the Compare Versions UI.
- Replaced `result.save()` with `Result.update({ marks, grade, version: version+1 }, { where: { id, version } })` — the `WHERE version = ?` clause makes the update atomic and eliminates the TOCTOU gap.

**Reasoning:** The `save()` approach reads and writes in two separate queries. Another writer can update between those two operations and the increment silently overwrites their change. The atomic `UPDATE ... WHERE version = ?` is the correct pattern.

---

## Receipt 5

**Timestamp:** 2026-06-07 15:40 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> Write the Playwright UI test for the faculty tripwire: faculty must not be able to enter marks before the exam date has passed. The test should log in as faculty, navigate to the marks entry form for a future exam, submit marks, and verify a meaningful error is shown.

**AI Response (trimmed):**
```js
test('faculty cannot enter marks before exam date', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'ramesh@college.edu');
  await page.fill('[name=password]', 'Faculty@1234');
  await page.click('[type=submit]');
  await page.waitForTimeout(3000);
  await page.goto('/faculty/exams/FUTURE_EXAM_ID/marks');
  await page.fill('[name=marks]', '75');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2000);
  await expect(page.locator('.error')).toContainText('exam');
});
```
AI used hardcoded `waitForTimeout` delays and a hardcoded exam UUID.

**Accepted decisions:**
- Overall test flow — login → navigate → submit → assert.
- Assertion on visible error text.

**Modified decisions:**
- Replaced `waitForTimeout(3000)` with `page.waitForURL('**/faculty/**')` after login and `page.waitForSelector('.tripwire-alert')` after submission — deterministic and faster.
- Replaced hardcoded exam UUID with a dynamic lookup via the API in `beforeAll`.

**Rejected decisions:**
- `waitForTimeout` pattern throughout — brittle on slow CI machines; selector-based waits are the correct approach.

**Reasoning:** Timeout-based waits are a common AI-generated anti-pattern for Playwright. They make tests flaky on slower environments. Selector-based waits are both faster and reliable.

---

## Receipt 6

**Timestamp:** 2026-06-07 18:30 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> Build the /metrics endpoint. It should return operation counts, average latency, and p95 latency for key operations: schedule_create, schedule_update, result_update, result_publish, bulk_import. The store should be in-memory and expose a record(operation, latencyMs) function.

**AI Response (trimmed):**
```js
const store = {};
const record = (op, latency) => {
  if (!store[op]) store[op] = { count: 0, latencies: [] };
  store[op].count++;
  store[op].latencies.push(latency);
};
const getMetrics = () => {
  return Object.entries(store).map(([op, data]) => ({
    operation: op,
    count: data.count,
    avgLatency: data.latencies.reduce((a,b) => a+b, 0) / data.count,
    p95Latency: data.latencies.sort((a,b) => a-b)[Math.floor(data.latencies.length * 0.95)],
  }));
};
```

**Accepted decisions:**
- In-memory store design.
- `record()` helper API.
- p95 calculation formula.

**Modified decisions:**
- Added `Math.ceil` instead of `Math.floor` for p95 index — `floor` underestimates at small sample sizes.
- Added a note to README that the store resets on server restart and Redis would be the production fix.

**Rejected decisions:**
- Nothing structurally rejected.

**Reasoning:** Minimal change needed. The p95 index off-by-one is a subtle but real issue at small sample sizes (< 20 observations).

---

## Receipt 7

**Timestamp:** 2026-06-08 07:00 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> Generate a sample_results.csv with at least 50 rows for the bulk import feature. Fields: exam_id, roll_no, marks. Use realistic roll numbers (CS2024001 format) and marks between 35 and 98.

**AI Response (trimmed):**
CSV with 52 rows, realistic roll numbers, marks spread across all grade bands, including 4 rows below 40 (F) and 3 rows with 90+ (O).

**Accepted decisions:**
- All 52 rows accepted as-is.
- Distribution across grade bands — good for testing the grading logic end-to-end.

**Modified decisions:**
- Added 3 duplicate rows at the end of the file (same exam_id + roll_no) to test idempotency — uploading the file twice must not create duplicates.

**Rejected decisions:**
- None.

**Reasoning:** The AI-generated CSV was correct. The only addition was deliberate duplicate rows to exercise the idempotency constraint.

---

## Receipt 8

**Timestamp:** 2026-06-08 08:45 IST
**Tool:** Claude (claude.ai)

**Prompt:**
> Write the useDraftRecovery React hook. It should persist unsaved result form data to localStorage keyed by examId, restore it automatically on mount, and clear it on successful save. Document limitations.

**AI Response (trimmed):**
```js
const useDraftRecovery = (examId) => {
  const key = `draft_result_${examId}`;
  const save = (data) => localStorage.setItem(key, JSON.stringify(data));
  const restore = () => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  };
  const clear = () => localStorage.removeItem(key);
  return { save, restore, clear };
};
```

**Accepted decisions:**
- Key scoped to `examId` — correct; prevents bleed between exams.
- `save`, `restore`, `clear` API.

**Modified decisions:**
- Added `savedAt` timestamp to stored payload so drafts older than 24 hours are auto-discarded on restore.
- Added try/catch around `JSON.parse` (corrupted localStorage can throw).

**Rejected decisions:**
- No validation of stored schema — added a version field `_v: 1` so stale drafts with different shapes are discarded rather than applied.

**Reasoning:** The base hook is correct. Production-grade draft recovery needs expiry and schema versioning to avoid silently applying stale or malformed data.
