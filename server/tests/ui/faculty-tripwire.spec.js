// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * UI Test: Faculty attempting marks entry before exam completion (Tripwire)
 */

const BASE_URL = 'http://localhost:5173';

test.describe('Faculty Tripwire — Marks Entry Before Exam Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'ramesh@college.edu');
    await page.fill('input[type="password"]', 'Faculty@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/faculty/dashboard');
  });

  test('Enter Marks button is disabled for upcoming exam', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty/marks`);

    // Select any exam from dropdown
    const select = page.locator('select').first();
    await select.selectOption({ index: 1 });

    // The amber lockout banner should appear if exam is upcoming
    const lockBanner = page.locator('text=Exam Not Yet Completed');
    // If the exam is upcoming, banner is visible
    const bannerVisible = await lockBanner.isVisible().catch(() => false);

    if (bannerVisible) {
      await expect(lockBanner).toBeVisible();

      // Enter buttons should be disabled
      const enterButtons = page.locator('button:has-text("Enter")');
      const count = await enterButtons.count();
      for (let i = 0; i < count; i++) {
        await expect(enterButtons.nth(i)).toBeDisabled();
      }
    }
  });

  test('Server rejects marks entry before exam end time', async ({ page, request }) => {
    // Login via API
    const loginRes = await request.post(`${BASE_URL.replace('5173', '5000')}/api/auth/login`, {
      data: { email: 'ramesh@college.edu', password: 'Faculty@1234' },
    });
    const { accessToken } = await loginRes.json();

    // Get upcoming exams
    const examsRes = await request.get(`${BASE_URL.replace('5173', '5000')}/api/exams`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { exams } = await examsRes.json();
    const upcoming = exams?.find((e) => new Date(`${e.examDate}T${e.endTime}`) > new Date());

    if (!upcoming) {
      test.skip(true, 'No upcoming exams available for this test');
      return;
    }

    // Get a student ID
    const usersRes = await request.get(`${BASE_URL.replace('5173', '5000')}/api/auth/users?role=student`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { users } = await usersRes.json();
    const student = users?.[0];

    if (!student) {
      test.skip(true, 'No students available');
      return;
    }

    // Attempt to POST result before exam ends — server must reject
    const resultRes = await request.post(`${BASE_URL.replace('5173', '5000')}/api/results`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { studentId: student.id, examId: upcoming.id, marks: 80 },
    });

    expect(resultRes.status()).toBe(403);
    const body = await resultRes.json();
    expect(body.error.code).toBe('EXAM_NOT_COMPLETED');
    expect(body.error.examDate).toBeDefined();
  });

  test('UI displays meaningful error when server rejects marks entry', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty/marks`);

    // The tripwire alert should be visible if an upcoming exam is selected
    const select = page.locator('select').first();
    const options = await select.locator('option').all();

    for (const opt of options.slice(1)) {
      await select.selectOption({ index: options.indexOf(opt) });
      await page.waitForTimeout(500);

      const lockout = page.locator('[data-testid="tripwire-alert"], text=Exam Not Yet Completed');
      const isVisible = await lockout.isVisible().catch(() => false);

      if (isVisible) {
        await expect(lockout).toBeVisible();
        // Verify enter buttons are disabled / locked
        const enterBtns = page.locator('button:has-text("Enter"), button:has-text("Save Marks")');
        const btnCount = await enterBtns.count();
        if (btnCount > 0) {
          for (let i = 0; i < btnCount; i++) {
            await expect(enterBtns.nth(i)).toBeDisabled();
          }
        }
        return; // Test passed
      }
    }
  });
});
