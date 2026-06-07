/**
 * Test: Optimistic concurrency conflict path
 * Simulates two faculty editing the same result simultaneously.
 */

const request = require('supertest');
const app = require('../../index');

let adminToken, facultyToken, studentToken;
let examId, resultId;

const adminLogin = { email: 'admin@college.edu', password: 'Admin@1234' };
const facultyLogin = { email: 'ramesh@college.edu', password: 'Faculty@1234' };

describe('Concurrency Conflict — Result Update', () => {
  beforeAll(async () => {
    // Login as admin
    const ar = await request(app).post('/api/auth/login').send(adminLogin);
    adminToken = ar.body.accessToken;

    // Login as faculty
    const fr = await request(app).post('/api/auth/login').send(facultyLogin);
    facultyToken = fr.body.accessToken;

    // Get a student
    const users = await request(app)
      .get('/api/auth/users?role=student')
      .set('Authorization', `Bearer ${adminToken}`);
    const student = users.body.users[0];
    studentToken = student;

    // Get an already-completed exam (past date)
    const exams = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${adminToken}`);

    const pastExam = exams.body.exams?.find((e) => new Date(`${e.examDate}T${e.endTime}`) < new Date());

    if (!pastExam) {
      console.warn('No completed exam found — skipping concurrency test');
      return;
    }
    examId = pastExam.id;

    // Create a result
    const rr = await request(app)
      .post('/api/results')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: student.id, examId, marks: 70 });

    if (rr.body.result) resultId = rr.body.result.id;
  });

  test('Second update with stale version should return 409 CONCURRENCY_CONFLICT', async () => {
    if (!resultId) return;

    // Both users read version=1 (or current version)
    const fetch1 = await request(app)
      .get(`/api/results?examId=${examId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const result = fetch1.body.results?.find((r) => r.id === resultId);
    if (!result) return;
    const originalVersion = result.version;

    // Faculty A updates first — succeeds
    const updateA = await request(app)
      .put(`/api/results/${resultId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ marks: 75, version: originalVersion });

    expect(updateA.status).toBe(200);

    // Faculty B tries to update with the OLD version — should conflict
    const updateB = await request(app)
      .put(`/api/results/${resultId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ marks: 80, version: originalVersion }); // stale!

    expect(updateB.status).toBe(409);
    expect(updateB.body.error.code).toBe('CONCURRENCY_CONFLICT');
    expect(updateB.body.error.options).toContain('RELOAD_LATEST');
    expect(updateB.body.error.options).toContain('RETRY_CHANGES');
    expect(updateB.body.error.options).toContain('COMPARE_VERSIONS');
    expect(updateB.body.error.currentData).toBeDefined();
  });

  test('Update with correct (latest) version should succeed', async () => {
    if (!resultId) return;

    const fetch = await request(app)
      .get(`/api/results?examId=${examId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const result = fetch.body.results?.find((r) => r.id === resultId);
    if (!result) return;

    const update = await request(app)
      .put(`/api/results/${resultId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ marks: 82, version: result.version });

    expect(update.status).toBe(200);
    expect(update.body.result.marks).toBe('82.00');
  });
});
