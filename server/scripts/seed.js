require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');
const { User } = require('../modules/auth/authModel');
const { Exam } = require('../modules/exam/examModel');
const { Result, computeGrade } = require('../modules/result/resultModel');
const { setupAssociations } = require('../modules/associations');

const ADMIN_USERS = [
  {
    key: 'admin1',
    name: 'Admin 1',
    email: 'admin1@college.edu',
    password: 'admin1@123',
    department: 'Administration',
  },
  {
    key: 'admin2',
    name: 'Admin 2',
    email: 'admin2@college.edu',
    password: 'admin2@123',
    department: 'Administration',
  },
];

const DEPARTMENTS = [
  {
    code: 'CSE',
    semester: 3,
    hallPrefix: 'CSE',
    subjects: {
      results: 'Data Structures',
      importReady: 'Database Lab',
      upcoming: 'Operating Systems',
    },
    examIds: {
      importReady: '11111111-1111-4111-8111-111111111111',
      upcoming: '22222222-2222-4222-8222-222222222222',
      results: '33333333-3333-4333-8333-333333333333',
    },
  },
  {
    code: 'ECE',
    semester: 4,
    hallPrefix: 'ECE',
    subjects: {
      results: 'Analog Circuits',
      importReady: 'Digital Signal Processing',
      upcoming: 'Microprocessors',
    },
    examIds: {
      results: '44444444-4444-4444-8444-444444444441',
      importReady: '44444444-4444-4444-8444-444444444442',
      upcoming: '44444444-4444-4444-8444-444444444443',
    },
  },
  {
    code: 'IT',
    semester: 5,
    hallPrefix: 'IT',
    subjects: {
      results: 'Web Technologies',
      importReady: 'Cyber Security',
      upcoming: 'Cloud Computing',
    },
    examIds: {
      results: '55555555-5555-4555-8555-555555555551',
      importReady: '55555555-5555-4555-8555-555555555552',
      upcoming: '55555555-5555-4555-8555-555555555553',
    },
  },
];

const RESULT_MARKS = [
  92, 81, 76, 64, 55, 49, 38, 88, 73, 67,
  58, 42, 95, 84, 61, 90, 47, 76, 64, 52,
  83, 69, 71, 58, 95, 41, 77, 62, 89, 73,
  56, 80, 67, 49, 92, 70, 63, 84, 51, 79,
  87, 46, 65, 75, 59, 94, 43, 81, 60, 86,
];

const pad3 = (value) => String(value).padStart(3, '0');

const getResultStatus = (index) => {
  if (index < 20) return 'published';
  if (index < 35) return 'ready';
  return 'draft';
};

const makeFacultyUsers = (department) => [1, 2].map((number) => ({
  key: `${department.code}-faculty-${number}`,
  name: `${department.code} Faculty ${number}`,
  email: `${department.code.toLowerCase()}faculty${number}@college.edu`,
  password: `faculty${number}@123`,
  role: 'faculty',
  department: department.code,
}));

const makeStudentUsers = (department) => Array.from({ length: 50 }, (_, index) => {
  const number = index + 1;
  return {
    key: `${department.code}-student-${number}`,
    name: `${department.code} Student ${number}`,
    email: `${department.code.toLowerCase()}student${number}@college.edu`,
    password: `student${number}@123`,
    role: 'student',
    rollNo: `${department.code}2026${pad3(number)}`,
    department: department.code,
  };
});

const clearDatabase = async (transaction) => {
  await Result.destroy({ where: {}, transaction });
  await Exam.destroy({ where: {}, transaction });
  await User.destroy({ where: {}, transaction });
};

const createUsers = async (transaction) => {
  const admins = {};
  for (const adminInput of ADMIN_USERS) {
    const admin = await User.create(
      {
        name: adminInput.name,
        email: adminInput.email,
        password: adminInput.password,
        role: 'admin',
        department: adminInput.department,
      },
      { transaction }
    );
    admins[adminInput.key] = admin;
  }

  const facultyByDepartment = {};
  const studentsByDepartment = {};

  for (const department of DEPARTMENTS) {
    facultyByDepartment[department.code] = [];
    studentsByDepartment[department.code] = [];

    for (const facultyInput of makeFacultyUsers(department)) {
      const faculty = await User.create(facultyInput, { transaction });
      facultyByDepartment[department.code].push(faculty);
    }

    for (const studentInput of makeStudentUsers(department)) {
      const student = await User.create(studentInput, { transaction });
      studentsByDepartment[department.code].push(student);
    }
  }

  return { admins, facultyByDepartment, studentsByDepartment };
};

const createDepartmentExams = async ({ department, admins, facultyByDepartment, transaction }) => {
  const [faculty1, faculty2] = facultyByDepartment[department.code];

  const resultsExam = await Exam.create(
    {
      id: department.examIds.results,
      subject: department.subjects.results,
      department: department.code,
      semester: department.semester,
      examDate: '2024-05-10',
      startTime: '09:00',
      endTime: '12:00',
      hall: `${department.hallPrefix} Hall A`,
      facultyId: faculty1.id,
      createdBy: admins.admin1.id,
    },
    { transaction }
  );

  const importReadyExam = await Exam.create(
    {
      id: department.examIds.importReady,
      subject: department.subjects.importReady,
      department: department.code,
      semester: department.semester,
      examDate: '2024-05-12',
      startTime: '14:00',
      endTime: '17:00',
      hall: `${department.hallPrefix} Lab`,
      facultyId: faculty2.id,
      createdBy: admins.admin1.id,
    },
    { transaction }
  );

  const upcomingExam = await Exam.create(
    {
      id: department.examIds.upcoming,
      subject: department.subjects.upcoming,
      department: department.code,
      semester: department.semester,
      examDate: '2099-12-15',
      startTime: '10:00',
      endTime: '13:00',
      hall: `${department.hallPrefix} Hall B`,
      facultyId: faculty2.id,
      createdBy: admins.admin2.id,
    },
    { transaction }
  );

  return { resultsExam, importReadyExam, upcomingExam };
};

const createResultsForDepartment = async ({
  department,
  resultsExam,
  admins,
  facultyByDepartment,
  studentsByDepartment,
  transaction,
}) => {
  const [faculty1] = facultyByDepartment[department.code];
  const students = studentsByDepartment[department.code];

  for (const [index, student] of students.entries()) {
    const marks = RESULT_MARKS[index];
    const status = getResultStatus(index);
    const published = status === 'published';

    await Result.create(
      {
        studentId: student.id,
        examId: resultsExam.id,
        marks,
        grade: computeGrade(marks),
        status,
        enteredBy: faculty1.id,
        publishedBy: published ? admins.admin2.id : null,
        publishedAt: published ? new Date('2024-05-20T09:00:00') : null,
        remarks: `${department.code} test result ${index + 1}`,
      },
      { transaction }
    );
  }
};

const seed = async () => {
  await connectDB();
  setupAssociations();

  const transaction = await sequelize.transaction();

  try {
    console.log('Resetting database...');
    await clearDatabase(transaction);

    console.log('Creating admins, faculty, and students...');
    const { admins, facultyByDepartment, studentsByDepartment } = await createUsers(transaction);

    console.log('Creating exams and result workflow data...');
    for (const department of DEPARTMENTS) {
      const { resultsExam, importReadyExam, upcomingExam } = await createDepartmentExams({
        department,
        admins,
        facultyByDepartment,
        transaction,
      });

      await createResultsForDepartment({
        department,
        resultsExam,
        admins,
        facultyByDepartment,
        studentsByDepartment,
        transaction,
      });

      console.log(
        `${department.code}: results=${resultsExam.id}, import-ready=${importReadyExam.id}, upcoming=${upcomingExam.id}`
      );
    }

    await transaction.commit();

    console.log('\nSeeding complete!');
    console.log('Created: 2 admins, 6 faculty, 150 students, 9 exams, 150 results.');
    console.log('\nLogin credentials:');
    console.log('  Admin 1: admin1@college.edu / admin1@123');
    console.log('  Admin 2: admin2@college.edu / admin2@123');
    console.log('  Faculty: {cse|ece|it}faculty{1|2}@college.edu / faculty{1|2}@123');
    console.log('  Students: {cse|ece|it}student{1-50}@college.edu / student{1-50}@123');
    console.log('\nResult states per department results exam: 20 published, 15 ready, 15 draft.');
    console.log('Import-ready exams are completed and empty. Upcoming exams are future locked.');
  } catch (err) {
    await transaction.rollback();
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

seed();
