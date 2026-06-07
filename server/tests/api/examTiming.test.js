const { Op } = require('sequelize');
const {
  buildCompletedExamWhere,
  buildNotCompletedExamWhere,
  getLocalDateTimeParts,
  isValidDateOnly,
  isExamCompletedAt,
} = require('../../utils/examTiming');

describe('Exam timing helpers', () => {
  const now = new Date('2026-01-07T10:30:00');

  test('uses local date and time parts for dashboard predicates', () => {
    expect(getLocalDateTimeParts(now)).toEqual({
      date: '2026-01-07',
      time: '10:30:00',
    });
  });

  test('only marks an exam completed after its end time', () => {
    expect(isExamCompletedAt('2026-01-07', '10:29:59', now)).toBe(true);
    expect(isExamCompletedAt('2026-01-07', '10:30:00', now)).toBe(true);
    expect(isExamCompletedAt('2026-01-07', '10:31:00', now)).toBe(false);
  });

  test('handles past and future exam dates', () => {
    expect(isExamCompletedAt('2026-01-06', '23:59:00', now)).toBe(true);
    expect(isExamCompletedAt('2026-01-08', '00:01:00', now)).toBe(false);
  });

  test('accepts only strict ISO date-only values', () => {
    expect(isValidDateOnly('2026-07-01')).toBe(true);
    expect(isValidDateOnly('01/07/2026')).toBe(false);
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2026-7-1')).toBe(false);
  });

  test('builds completed and not-completed dashboard where clauses', () => {
    const completed = buildCompletedExamWhere(Op, { facultyId: 'faculty-1' }, now);
    const notCompleted = buildNotCompletedExamWhere(Op, { facultyId: 'faculty-1' }, now);

    expect(completed.facultyId).toBe('faculty-1');
    expect(completed.isDeleted).toBe(false);
    expect(completed[Op.or]).toEqual([
      { examDate: { [Op.lt]: '2026-01-07' } },
      { examDate: '2026-01-07', endTime: { [Op.lte]: '10:30:00' } },
    ]);

    expect(notCompleted.facultyId).toBe('faculty-1');
    expect(notCompleted.isDeleted).toBe(false);
    expect(notCompleted[Op.or]).toEqual([
      { examDate: { [Op.gt]: '2026-01-07' } },
      { examDate: '2026-01-07', endTime: { [Op.gt]: '10:30:00' } },
    ]);
  });
});
