const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendResultNotification = async ({
  studentEmail, studentName, subject, examDate, marks, grade, department, semester,
}) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn('Email credentials not configured. Skipping notification for', studentEmail);
    return;
  }

  const transporter = createTransporter();

  const gradeColor = { O: '#16a34a', 'A+': '#2563eb', A: '#7c3aed', B: '#d97706', C: '#ea580c', F: '#dc2626' };
  const color = gradeColor[grade] || '#374151';

  const mailOptions = {
    from: `"Exam Scheduler" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `📢 Result Published: ${subject}`,
    html: `
      <!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr><td style="background:#1e40af;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">📋 Your Result Has Been Published</h1>
            </td></tr>
            <tr><td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:16px;color:#374151;">Hello <strong>${studentName}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Your result for the following exam has been published by the admin.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr><td style="padding:20px 24px;"><table width="100%" cellpadding="6" cellspacing="0">
                  <tr><td style="font-size:13px;color:#6b7280;width:40%;">Subject</td><td style="font-size:14px;color:#111827;font-weight:600;">${subject}</td></tr>
                  <tr><td style="font-size:13px;color:#6b7280;">Department</td><td style="font-size:14px;color:#111827;">${department || '—'}</td></tr>
                  <tr><td style="font-size:13px;color:#6b7280;">Semester</td><td style="font-size:14px;color:#111827;">${semester || '—'}</td></tr>
                  <tr><td style="font-size:13px;color:#6b7280;">Exam Date</td><td style="font-size:14px;color:#111827;">${examDate}</td></tr>
                  <tr><td style="font-size:13px;color:#6b7280;">Marks</td><td style="font-size:14px;color:#111827;font-weight:600;">${marks} / 100</td></tr>
                  <tr><td style="font-size:13px;color:#6b7280;">Grade</td><td>
                    <span style="display:inline-block;padding:3px 12px;border-radius:12px;background:${color};color:#fff;font-weight:700;font-size:14px;">${grade}</span>
                  </td></tr>
                </table></td></tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Log in to your student portal to view the full details.</p>
            </td></tr>
            <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">This is an automated notification from Exam Scheduler. Please do not reply.</p>
            </td></tr>
          </table>
        </td></tr></table>
      </body></html>
    `,
  };

  await transporter.sendMail(mailOptions);
  logger.info(`Result notification sent to ${studentEmail} for exam: ${subject}`);
};

module.exports = { sendResultNotification };