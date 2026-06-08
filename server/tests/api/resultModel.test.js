process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'exam_scheduler_test';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';

const { Result } = require('../../modules/result/resultModel');

const UUIDS = {
  studentId: '11111111-1111-4111-8111-111111111111',
  examId: '22222222-2222-4222-8222-222222222222',
  enteredBy: '33333333-3333-4333-8333-333333333333',
};

describe('Result model grade computation', () => {
  it('computes grade before validation for decimal marks', async () => {
    const result = Result.build({
      ...UUIDS,
      marks: 84.99,
    });

    await result.validate();

    expect(result.grade).toBe('A+');
  });

  it('recomputes grade before validation when marks change', async () => {
    const result = Result.build(
      {
        ...UUIDS,
        marks: 74,
        grade: 'A',
        status: 'draft',
        version: 1,
      },
      { isNewRecord: false }
    );

    result.marks = 39.99;
    await result.validate();

    expect(result.grade).toBe('F');
  });
});
