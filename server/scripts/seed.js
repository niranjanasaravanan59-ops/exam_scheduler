require('dotenv').config();
const { connectDB } = require('../config/db');
const { User } = require('../modules/auth/authModel');
const { Exam } = require('../modules/exam/examModel');
const { Result, computeGrade } = require('../modules/result/resultModel');
const { setupAssociations } = require('../modules/associations');

const DEMO_EXAMS = {
  importReady: '11111111-1111-4111-8111-111111111111',
  upcomingTripwire: '22222222-2222-4222-8222-222222222222',
  publishedDemo: '33333333-3333-4333-8333-333333333333',
};

const MANUAL_TEST_STUDENTS = [
  { name: 'Student 1', email: 'student1@college.edu', password: 'Std@1', rollNo: 'CS2021001', department: 'Computer Science' },
  { name: 'Student 2', email: 'student2@college.edu', password: 'Std@2', rollNo: 'CS2021002', department: 'Computer Science' },
  { name: 'Student 3', email: 'student3@college.edu', password: 'Std@3', rollNo: 'CS2021003', department: 'Computer Science' },
  { name: 'Student 4', email: 'student4@college.edu', password: 'Std@4', rollNo: 'CS2021004', department: 'Computer Science' },
  { name: 'Student 5', email: 'student5@college.edu', password: 'Std@5', rollNo: 'CS2021005', department: 'Computer Science' },
  { name: 'Student 6', email: 'student6@college.edu', password: 'Std@6', rollNo: 'CS2021006', department: 'Computer Science' },
  { name: 'Student 7', email: 'student7@college.edu', password: 'Std@7', rollNo: 'CS2021007', department: 'Computer Science' },
  { name: 'Student 8', email: 'student8@college.edu', password: 'Std@8', rollNo: 'CS2021008', department: 'Computer Science' },
  { name: 'Student 9', email: 'student9@college.edu', password: 'Std@9', rollNo: 'CS2021009', department: 'Computer Science' },
  { name: 'Student 10', email: 'student10@college.edu', password: 'Std@10', rollNo: 'CS2021010', department: 'Computer Science' },
  { name: 'Student 11', email: 'student11@college.edu', password: 'Std@11', rollNo: 'CS2021011', department: 'Computer Science' },
  { name: 'Student 12', email: 'student12@college.edu', password: 'Std@12', rollNo: 'CS2021012', department: 'Computer Science' },
  { name: 'Student 13', email: 'student13@college.edu', password: 'Std@13', rollNo: 'CS2021013', department: 'Computer Science' },
  { name: 'Student 14', email: 'student14@college.edu', password: 'Std@14', rollNo: 'CS2021014', department: 'Computer Science' },
  { name: 'Student 15', email: 'student15@college.edu', password: 'Std@15', rollNo: 'CS2021015', department: 'Computer Science' },
  { name: 'Student 16', email: 'student16@college.edu', password: 'Std@16', rollNo: 'CS2021016', department: 'Computer Science' },
  { name: 'Student 17', email: 'student17@college.edu', password: 'Std@17', rollNo: 'CS2021017', department: 'Computer Science' },
  { name: 'Student 18', email: 'student18@college.edu', password: 'Std@18', rollNo: 'CS2021018', department: 'Computer Science' },
  { name: 'Student 19', email: 'student19@college.edu', password: 'Std@19', rollNo: 'CS2021019', department: 'Computer Science' },
  { name: 'Student 20', email: 'student20@college.edu', password: 'Std@20', rollNo: 'CS2021020', department: 'Computer Science' },
  { name: 'Student 21', email: 'student21@college.edu', password: 'Std@21', rollNo: 'CS2021021', department: 'Computer Science' },
  { name: 'Student 22', email: 'student22@college.edu', password: 'Std@22', rollNo: 'CS2021022', department: 'Computer Science' },
  { name: 'Student 23', email: 'student23@college.edu', password: 'Std@23', rollNo: 'CS2021023', department: 'Computer Science' },
  { name: 'Student 24', email: 'student24@college.edu', password: 'Std@24', rollNo: 'CS2021024', department: 'Computer Science' },
  { name: 'Student 25', email: 'student25@college.edu', password: 'Std@25', rollNo: 'CS2021025', department: 'Computer Science' },
  { name: 'Student 26', email: 'student26@college.edu', password: 'Std@26', rollNo: 'CS2021026', department: 'Computer Science' },
  { name: 'Student 27', email: 'student27@college.edu', password: 'Std@27', rollNo: 'CS2021027', department: 'Computer Science' },
  { name: 'Student 28', email: 'student28@college.edu', password: 'Std@28', rollNo: 'CS2021028', department: 'Computer Science' },
  { name: 'Student 29', email: 'student29@college.edu', password: 'Std@29', rollNo: 'CS2021029', department: 'Computer Science' },
  { name: 'Student 30', email: 'student30@college.edu', password: 'Std@30', rollNo: 'CS2021030', department: 'Computer Science' },
  { name: 'Student 31', email: 'student31@college.edu', password: 'Std@31', rollNo: 'CS2021031', department: 'Computer Science' },
  { name: 'Student 32', email: 'student32@college.edu', password: 'Std@32', rollNo: 'CS2021032', department: 'Computer Science' },
  { name: 'Student 33', email: 'student33@college.edu', password: 'Std@33', rollNo: 'CS2021033', department: 'Computer Science' },
  { name: 'Student 34', email: 'student34@college.edu', password: 'Std@34', rollNo: 'CS2021034', department: 'Computer Science' },
  { name: 'Student 35', email: 'student35@college.edu', password: 'Std@35', rollNo: 'CS2021035', department: 'Computer Science' },
  { name: 'Student 36', email: 'student36@college.edu', password: 'Std@36', rollNo: 'CS2021036', department: 'Computer Science' },
  { name: 'Student 37', email: 'student37@college.edu', password: 'Std@37', rollNo: 'CS2021037', department: 'Computer Science' },
  { name: 'Student 38', email: 'student38@college.edu', password: 'Std@38', rollNo: 'CS2021038', department: 'Computer Science' },
  { name: 'Student 39', email: 'student39@college.edu', password: 'Std@39', rollNo: 'CS2021039', department: 'Computer Science' },
  { name: 'Student 40', email: 'student40@college.edu', password: 'Std@40', rollNo: 'CS2021040', department: 'Computer Science' },
  { name: 'Student 41', email: 'student41@college.edu', password: 'Std@41', rollNo: 'CS2021041', department: 'Computer Science' },
  { name: 'Student 42', email: 'student42@college.edu', password: 'Std@42', rollNo: 'CS2021042', department: 'Computer Science' },
  { name: 'Student 43', email: 'student43@college.edu', password: 'Std@43', rollNo: 'CS2021043', department: 'Computer Science' },
  { name: 'Student 44', email: 'student44@college.edu', password: 'Std@44', rollNo: 'CS2021044', department: 'Computer Science' },
  { name: 'Student 45', email: 'student45@college.edu', password: 'Std@45', rollNo: 'CS2021045', department: 'Computer Science' },
  { name: 'Student 46', email: 'student46@college.edu', password: 'Std@46', rollNo: 'CS2021046', department: 'Computer Science' },
  { name: 'Student 47', email: 'student47@college.edu', password: 'Std@47', rollNo: 'CS2021047', department: 'Computer Science' },
  { name: 'Student 48', email: 'student48@college.edu', password: 'Std@48', rollNo: 'CS2021048', department: 'Computer Science' },
  { name: 'Student 49', email: 'student49@college.edu', password: 'Std@49', rollNo: 'CS2021049', department: 'Computer Science' },
  { name: 'Student 50', email: 'student50@college.edu', password: 'Std@50', rollNo: 'CS2021050', department: 'Computer Science' },
];

const MANUAL_TEST_MARKS = [
  92, 81, 76, 64, 55, 49, 38, 88, 73, 67,
  58, 42, 95, 84, 61, 90, 47, 76, 64, 52,
  83, 69, 71, 58, 95, 41, 77, 62, 89, 73,
  56, 80, 67, 49, 92, 70, 63, 84, 51, 79,
  87, 46, 65, 75, 59, 94, 43, 81, 60, 86,
];

const seed = async () => {
  await connectDB();
  setupAssociations();

  console.log('Seeding database...');

  const [admin] = await User.findOrCreate({
    where: { email: 'admin@college.edu' },
    defaults: {
      name: 'System Admin',
      email: 'admin@college.edu',
      password: 'Admin@1234',
      role: 'admin',
      department: 'Administration',
    },
  });
  console.log('Admin:', admin.email);

  const facultyData = [
    { name: 'Dr. Ramesh Kumar', email: 'ramesh@college.edu', department: 'Computer Science' },
    { name: 'Prof. Sunita Sharma', email: 'sunita@college.edu', department: 'Computer Science' },
    { name: 'Dr. Anil Verma', email: 'anil@college.edu', department: 'Mathematics' },
  ];

  const facultyByEmail = {};
  for (const facultyInput of facultyData) {
    const [faculty] = await User.findOrCreate({
      where: { email: facultyInput.email },
      defaults: { ...facultyInput, password: 'Faculty@1234', role: 'faculty' },
    });
    facultyByEmail[faculty.email] = faculty;
    console.log('Faculty:', faculty.email);
  }

  const students = [];
  for (const [index, studentInput] of MANUAL_TEST_STUDENTS.entries()) {
    const [student, created] = await User.findOrCreate({
      where: { rollNo: studentInput.rollNo },
      defaults: {
        name: studentInput.name,
        email: studentInput.email,
        password: studentInput.password,
        role: 'student',
        rollNo: studentInput.rollNo,
        department: studentInput.department,
      },
    });
    if (!created) {
      await student.update({
        name: studentInput.name,
        email: studentInput.email,
        password: studentInput.password,
        department: studentInput.department,
      });
    }
    students.push(student);
    if (index < 3) console.log('Student:', student.email, '/', student.rollNo, '/', studentInput.password);
  }

  const ramesh = facultyByEmail['ramesh@college.edu'];
  const sunita = facultyByEmail['sunita@college.edu'];

  const [importExam] = await Exam.findOrCreate({
    where: { id: DEMO_EXAMS.importReady },
    defaults: {
      id: DEMO_EXAMS.importReady,
      subject: 'Mathematics',
      department: 'Computer Science',
      semester: 3,
      examDate: '2024-05-10',
      startTime: '09:00',
      endTime: '12:00',
      hall: 'Hall A',
      facultyId: ramesh.id,
      createdBy: admin.id,
    },
  });

  await Exam.findOrCreate({
    where: { id: DEMO_EXAMS.upcomingTripwire },
    defaults: {
      id: DEMO_EXAMS.upcomingTripwire,
      subject: 'Data Structures',
      department: 'Computer Science',
      semester: 3,
      examDate: '2099-12-15',
      startTime: '10:00',
      endTime: '13:00',
      hall: 'Hall B',
      facultyId: ramesh.id,
      createdBy: admin.id,
    },
  });

  const [publishedExam] = await Exam.findOrCreate({
    where: { id: DEMO_EXAMS.publishedDemo },
    defaults: {
      id: DEMO_EXAMS.publishedDemo,
      subject: 'Database Systems',
      department: 'Computer Science',
      semester: 3,
      examDate: '2024-05-12',
      startTime: '14:00',
      endTime: '17:00',
      hall: 'Hall C',
      facultyId: sunita.id,
      createdBy: admin.id,
    },
  });

  for (let i = 0; i < MANUAL_TEST_MARKS.length; i++) {
    const status = i < 20 ? 'published' : i < 35 ? 'ready' : 'draft';
    const [result] = await Result.findOrCreate({
      where: { studentId: students[i].id, examId: publishedExam.id },
      defaults: {
        studentId: students[i].id,
        examId: publishedExam.id,
        marks: MANUAL_TEST_MARKS[i],
        grade: computeGrade(MANUAL_TEST_MARKS[i]),
        status,
        enteredBy: sunita.id,
        publishedBy: status === 'published' ? admin.id : null,
        publishedAt: status === 'published' ? new Date('2024-05-20T09:00:00') : null,
      },
    });
    await result.update({
      marks: MANUAL_TEST_MARKS[i],
      status,
      enteredBy: sunita.id,
      publishedBy: status === 'published' ? admin.id : null,
      publishedAt: status === 'published' ? new Date('2024-05-20T09:00:00') : null,
    });
  }

  console.log('Completed import exam:', importExam.subject, '/', importExam.id);
  console.log('Seeding complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:   admin@college.edu / Admin@1234');
  console.log('  Faculty: ramesh@college.edu / Faculty@1234');
  console.log('  Student: student1@college.edu / Std@1');
  console.log('  Student pattern: student{1-50}@college.edu / Std@{1-50}');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
