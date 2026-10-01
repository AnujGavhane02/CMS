import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const getFromEmail = () => {
  const configuredEmail = process.env.FROM_EMAIL?.trim();
  if (configuredEmail && configuredEmail.toLowerCase() !== 'noreply@institute.edu') {
    return configuredEmail;
  }
  return process.env.SMTP_USER;
};

// Send email notification
export const sendEmail = async (to, subject, html, text = '') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'CMS System'} <${getFromEmail()}>`,
      to,
      subject,
      html,
      text
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}`, {
      messageId: result.messageId,
      subject
    });

    return result;
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

// Send complaint notification
export const sendComplaintNotification = async (complaint, user, type = 'created') => {
  try {
    const { title, complaintId, category, urgency, status } = complaint;
    const { name, email } = user;

    let subject, html;

    switch (type) {
      case 'created':
        subject = `Complaint Created - ${complaintId}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Complaint Created Successfully</h2>
            <p>Dear ${name},</p>
            <p>Your complaint has been created successfully. Here are the details:</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Complaint Details</h3>
              <p><strong>Complaint ID:</strong> ${complaintId}</p>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Urgency:</strong> ${urgency.toUpperCase()}</p>
              <p><strong>Status:</strong> ${status.toUpperCase()}</p>
            </div>
            <p>You can track your complaint status using the Complaint ID.</p>
            <p>Thank you for using our Complaint Management System.</p>
          </div>
        `;
        break;

      case 'status_updated':
        subject = `Complaint Status Updated - ${complaintId}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Complaint Status Updated</h2>
            <p>Dear ${name},</p>
            <p>Your complaint status has been updated:</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Complaint Details</h3>
              <p><strong>Complaint ID:</strong> ${complaintId}</p>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>New Status:</strong> ${status.toUpperCase()}</p>
            </div>
            <p>You can track your complaint status using the Complaint ID.</p>
          </div>
        `;
        break;

      case 'resolved':
        subject = `Complaint Resolved - ${complaintId}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Complaint Resolved</h2>
            <p>Dear ${name},</p>
            <p>Great news! Your complaint has been resolved:</p>
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Complaint Details</h3>
              <p><strong>Complaint ID:</strong> ${complaintId}</p>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>Status:</strong> RESOLVED</p>
            </div>
            <p>We would appreciate your feedback on the resolution. Please rate your experience.</p>
            <p>Thank you for using our Complaint Management System.</p>
          </div>
        `;
        break;

      default:
        throw new Error('Invalid notification type');
    }

    await sendEmail(email, subject, html);
  } catch (error) {
    logger.error('Complaint notification email failed:', error);
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const { name, email } = user;
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>You have requested to reset your password. Click the link below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Thank you,<br>CMS Team</p>
      </div>
    `;

    await sendEmail(email, subject, html);
  } catch (error) {
    logger.error('Password reset email failed:', error);
    throw error;
  }
};

// Send OTP email — used for both email verification and password reset
export const sendOtpEmail = async (user, otp, type = 'email_verify') => {
  const { name, email } = user;
  const isReset = type === 'password_reset';

  const subject = isReset ? 'Password Reset OTP — CMS' : 'Email Verification OTP — CMS';
  const headingText = isReset ? 'Password Reset OTP' : 'Verify Your Email Address';
  const purposeText = isReset
    ? 'reset your password'
    : 'verify your email address and complete registration';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
      <div style="background: #2563eb; padding: 28px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">${headingText}</h2>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 15px;">Dear <strong>${name}</strong>,</p>
        <p style="color: #374151; font-size: 15px;">
          Use the OTP below to ${purposeText}. This code is valid for <strong>10 minutes</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 20px 40px;">
            <span style="font-size: 40px; font-weight: 800; letter-spacing: 14px; color: #1d4ed8; font-family: monospace;">${otp}</span>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px;">
          If you did not request this, please ignore this email. Do not share this OTP with anyone.
        </p>
        <p style="color: #374151; font-size: 14px; margin-top: 24px;">
          Thanks,<br/><strong>CMS Team</strong>
        </p>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
};

// Account approved by admin
export const sendAccountApprovedEmail = async (user) => {
  const { name, email, role } = user;
  const roleLabel = role.replace('_', ' ').toUpperCase();
  const subject = 'Your CMS Account Has Been Approved';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #16a34a; padding: 28px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Account Approved!</h2>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">Dear <strong>${name}</strong>,</p>
        <p style="color: #374151;">Your CMS account has been reviewed and approved by an administrator. You can now log in and access all features.</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 8px 0 0;"><strong>Role:</strong> ${roleLabel}</p>
        </div>
        <p style="color: #374151;">If you have any questions, please contact our support team.</p>
        <p style="color: #374151;">Thanks,<br/><strong>CMS Team</strong></p>
      </div>
    </div>
  `;
  await sendEmail(email, subject, html);
};

// New complaint alert to sub-admin
export const sendNewComplaintAlertToSubAdmin = async (complaint, subAdmin, deptName) => {
  const { name, email } = subAdmin;
  const { complaintId, title, category, priority, urgency } = complaint;
  const subject = `New Complaint in Your Department — ${complaintId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; padding: 28px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">New Complaint Submitted</h2>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">Dear <strong>${name}</strong>,</p>
        <p style="color: #374151;">A new complaint has been submitted in the <strong>${deptName}</strong> department and requires your attention.</p>
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Complaint ID:</strong> ${complaintId}</p>
          <p style="margin: 8px 0 0;"><strong>Title:</strong> ${title}</p>
          ${category ? `<p style="margin: 8px 0 0;"><strong>Category:</strong> ${category}</p>` : ''}
          <p style="margin: 8px 0 0;"><strong>Priority:</strong> ${priority}/10</p>
          <p style="margin: 8px 0 0;"><strong>Urgency:</strong> ${urgency.toUpperCase()}</p>
        </div>
        <p style="color: #374151;">Please log in to the CMS to review and process this complaint.</p>
        <p style="color: #374151;">Thanks,<br/><strong>CMS Team</strong></p>
      </div>
    </div>
  `;
  await sendEmail(email, subject, html);
};

// Status update to complaint owner
export const sendStatusUpdateToUser = async (complaint) => {
  const { complaintId, title, status, userEmail, userName, isAnonymous } = complaint;
  if (isAnonymous || !userEmail || userEmail === 'anonymous@system.local') return;
  const statusColor = status === 'resolved' ? '#16a34a' : status === 'rejected' ? '#dc2626' : '#2563eb';
  const subject = `Your Complaint Status Updated — ${complaintId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${statusColor}; padding: 28px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Complaint Status Updated</h2>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">Dear <strong>${userName}</strong>,</p>
        <p style="color: #374151;">The status of your complaint has been updated.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Complaint ID:</strong> ${complaintId}</p>
          <p style="margin: 8px 0 0;"><strong>Title:</strong> ${title}</p>
          <p style="margin: 8px 0 0;"><strong>New Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status.toUpperCase()}</span></p>
        </div>
        <p style="color: #374151;">Log in to track further updates on your complaint.</p>
        <p style="color: #374151;">Thanks,<br/><strong>CMS Team</strong></p>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, html);
};

// Status change notification to sub-admin (when someone else updates the status)
export const sendStatusUpdateToSubAdmin = async (complaint, subAdmin) => {
  const { name, email } = subAdmin;
  const { complaintId, title, status, category } = complaint;
  const subject = `Complaint Status Changed — ${complaintId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #7c3aed; padding: 28px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Complaint Status Changed</h2>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">Dear <strong>${name}</strong>,</p>
        <p style="color: #374151;">A complaint in your department has been updated.</p>
        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Complaint ID:</strong> ${complaintId}</p>
          <p style="margin: 8px 0 0;"><strong>Title:</strong> ${title}</p>
          ${category ? `<p style="margin: 8px 0 0;"><strong>Category:</strong> ${category}</p>` : ''}
          <p style="margin: 8px 0 0;"><strong>New Status:</strong> ${status.toUpperCase()}</p>
        </div>
        <p style="color: #374151;">Please log in for full details.</p>
        <p style="color: #374151;">Thanks,<br/><strong>CMS Team</strong></p>
      </div>
    </div>
  `;
  await sendEmail(email, subject, html);
};

// Escalation alert — sent by the background job
export const sendEscalationAlertEmail = async (complaints, recipient) => {
  const { name, email } = recipient;
  const count = complaints.length;
  const subject = `[URGENT] ${count} Escalated Complaint${count > 1 ? 's' : ''} — SLA Breached`;

  const rows = complaints.map(c => {
    const overdueDays = Math.floor(c.overdueHours / 24);
    const overdueLabel = overdueDays >= 1
      ? `${overdueDays}d ${c.overdueHours % 24}h overdue`
      : `${c.overdueHours}h overdue`;
    return `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${c.complaintId}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${c.title}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">${c.priority}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:bold;">${overdueLabel}</td>
      </tr>`;
  }).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: #dc2626; padding: 28px 32px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">SLA Breach — Immediate Action Required</h2>
      </div>
      <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">Dear <strong>${name}</strong>,</p>
        <p style="color: #374151;">The following <strong>${count}</strong> complaint${count > 1 ? 's have' : ' has'} breached their SLA deadline and require immediate attention:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead>
            <tr style="background:#fef2f2;">
              <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;">ID</th>
              <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;">Title</th>
              <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;">Priority</th>
              <th style="padding:10px;text-align:left;border-bottom:2px solid #e2e8f0;">Overdue</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color: #374151;">Please log in to the CMS immediately to address these complaints.</p>
        <p style="color: #374151;">Thanks,<br/><strong>CMS Team</strong></p>
      </div>
    </div>
  `;
  await sendEmail(email, subject, html);
};

// Send welcome email
export const sendWelcomeEmail = async (user) => {
  try {
    const { name, email, role } = user;

    const subject = 'Welcome to CMS - Complaint Management System';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to CMS!</h2>
        <p>Dear ${name},</p>
        <p>Welcome to our Complaint Management System! Your account has been created successfully.</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Account Details</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role.replace('_', ' ').toUpperCase()}</p>
        </div>
        <p>You can now log in to the system and start using our services.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Thank you,<br>CMS Team</p>
      </div>
    `;

    await sendEmail(email, subject, html);
  } catch (error) {
    logger.error('Welcome email failed:', error);
    throw error;
  }
};
