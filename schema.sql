-- ============================================================
-- Exam Scheduler & Results Publisher — MySQL Schema
-- Run this ONCE to create the database and all tables.
-- After that, use Sequelize migrations for schema changes.
-- ============================================================

CREATE DATABASE IF NOT EXISTS exam_scheduler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE exam_scheduler;

-- ─────────────────────────────────────────────────────────────
-- TABLE: users
-- Covers: Admin, Faculty, Student roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)        NOT NULL  COMMENT 'UUID primary key',
  name        VARCHAR(100)    NOT NULL,
  email       VARCHAR(150)    NOT NULL,
  password    VARCHAR(255)    NOT NULL  COMMENT 'bcrypt hash',
  role        ENUM('admin','faculty','student') NOT NULL,
  rollNo      VARCHAR(50)     NULL      COMMENT 'Students only',
  department  VARCHAR(100)    NULL,
  isActive    TINYINT(1)      NOT NULL  DEFAULT 1,
  lastLoginAt DATETIME        NULL,
  createdAt   DATETIME        NOT NULL,
  updatedAt   DATETIME        NOT NULL,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_users_email   (email),
  INDEX       idx_users_role   (role),
  INDEX       idx_users_rollno (rollNo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLE: exams
-- Covers: Schedule management, clash detection, soft-delete,
--         optimistic concurrency (version column)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id          CHAR(36)        NOT NULL,
  subject     VARCHAR(150)    NOT NULL,
  department  VARCHAR(100)    NOT NULL,
  semester    TINYINT UNSIGNED NOT NULL COMMENT '1–12',
  examDate    DATE            NOT NULL,
  startTime   TIME            NOT NULL,
  endTime     TIME            NOT NULL,
  hall        VARCHAR(100)    NOT NULL,
  facultyId   CHAR(36)        NULL      COMMENT 'FK → users(id), assigned faculty',
  createdBy   CHAR(36)        NOT NULL  COMMENT 'FK → users(id), admin who created',
  version     INT UNSIGNED    NOT NULL  DEFAULT 1 COMMENT 'Optimistic concurrency version',
  isDeleted   TINYINT(1)      NOT NULL  DEFAULT 0 COMMENT 'Soft delete flag',
  createdAt   DATETIME        NOT NULL,
  updatedAt   DATETIME        NOT NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_exams_faculty  FOREIGN KEY (facultyId)  REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_exams_creator  FOREIGN KEY (createdBy)  REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,

  INDEX idx_exams_dept_sem  (department, semester),
  INDEX idx_exams_date      (examDate),
  INDEX idx_exams_faculty   (facultyId),
  INDEX idx_exams_subject   (subject),
  INDEX idx_exams_deleted   (isDeleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLE: results
-- Covers: Marks entry, server-side grade computation,
--         workflow (draft→ready→published), optimistic
--         concurrency, bulk import idempotency
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id          CHAR(36)        NOT NULL,
  studentId   CHAR(36)        NOT NULL  COMMENT 'FK → users(id)',
  examId      CHAR(36)        NOT NULL  COMMENT 'FK → exams(id)',

  -- Grade is ALWAYS server-computed from marks.
  -- Scale: 90+=O, 75+=A+, 60+=A, 50+=B, 40+=C, <40=F
  marks       DECIMAL(5,2)    NOT NULL  COMMENT '0.00 – 100.00',
  grade       ENUM('O','A+','A','B','C','F') NOT NULL COMMENT 'Server-computed, never from client',

  -- Workflow state machine: draft → ready → published
  -- Only Admin can transition to published.
  -- Students see ONLY published results.
  status      ENUM('draft','ready','published') NOT NULL DEFAULT 'draft',

  enteredBy   CHAR(36)        NOT NULL  COMMENT 'FK → users(id), faculty or admin who entered marks',
  publishedBy CHAR(36)        NULL      COMMENT 'FK → users(id), admin who published',
  publishedAt DATETIME        NULL,

  -- importBatch: UUID of the CSV batch; used for idempotency
  -- Uploading the same CSV twice will not create duplicates
  importBatch VARCHAR(100)    NULL      COMMENT 'CSV import batch UUID',

  version     INT UNSIGNED    NOT NULL  DEFAULT 1 COMMENT 'Optimistic concurrency version',
  remarks     VARCHAR(500)    NULL,
  createdAt   DATETIME        NOT NULL,
  updatedAt   DATETIME        NOT NULL,

  PRIMARY KEY (id),

  -- One result per student per exam
  UNIQUE KEY uq_results_student_exam (studentId, examId),

  CONSTRAINT fk_results_student    FOREIGN KEY (studentId)   REFERENCES users(id)  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_results_exam       FOREIGN KEY (examId)      REFERENCES exams(id)  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_results_entered    FOREIGN KEY (enteredBy)   REFERENCES users(id)  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_results_published  FOREIGN KEY (publishedBy) REFERENCES users(id)  ON UPDATE CASCADE ON DELETE SET NULL,

  INDEX idx_results_exam        (examId),
  INDEX idx_results_student     (studentId),
  INDEX idx_results_status      (status),
  INDEX idx_results_batch       (importBatch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TABLE: SequelizeMeta  (managed by sequelize-cli)
-- Tracks which migrations have been run.
-- Created automatically by "npm run migrate" — listed here
-- for documentation purposes only.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS SequelizeMeta (
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (name),
  UNIQUE KEY name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- GRADING RULES (enforced in resultModel.js beforeSave hook)
-- ─────────────────────────────────────────────────────────────
-- marks >= 90  → O
-- marks >= 75  → A+
-- marks >= 60  → A
-- marks >= 50  → B
-- marks >= 40  → C
-- marks <  40  → F
--
-- Client MUST NOT send grade. The server always computes it.
-- ─────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────
-- USEFUL QUERIES FOR DEVELOPMENT / DEBUGGING
-- ─────────────────────────────────────────────────────────────

-- View all exams with faculty name:
-- SELECT e.*, u.name AS facultyName
-- FROM exams e
-- LEFT JOIN users u ON u.id = e.facultyId
-- WHERE e.isDeleted = 0
-- ORDER BY e.examDate, e.startTime;

-- View published results for a student:
-- SELECT r.marks, r.grade, e.subject, e.examDate
-- FROM results r
-- JOIN exams e ON e.id = r.examId
-- WHERE r.studentId = '<student_uuid>'
--   AND r.status = 'published';

-- Check for any exam clashes in a department on a date:
-- SELECT e1.subject AS exam1, e2.subject AS exam2,
--        e1.startTime, e1.endTime
-- FROM exams e1
-- JOIN exams e2
--   ON e1.id <> e2.id
--  AND e1.examDate = e2.examDate
--  AND e1.department = e2.department
--  AND e1.semester = e2.semester
--  AND e1.startTime < e2.endTime
--  AND e1.endTime > e2.startTime
-- WHERE e1.isDeleted = 0 AND e2.isDeleted = 0;

-- Pass percentage per exam:
-- SELECT e.subject, e.examDate,
--        COUNT(*) AS total,
--        SUM(r.grade <> 'F') AS passed,
--        ROUND(100.0 * SUM(r.grade <> 'F') / COUNT(*), 2) AS passPercent
-- FROM results r
-- JOIN exams e ON e.id = r.examId
-- WHERE r.status = 'published'
-- GROUP BY r.examId;
