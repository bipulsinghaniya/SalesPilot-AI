import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtpUser || !env.smtpPass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[EmailMock] To: ${to} | Subject: ${subject}`);
    return { delivered: false, mocked: true, messageId: `mock-${Date.now()}` };
  }

  const info = await mailer.sendMail({
    from: env.emailFrom,
    to,
    subject,
    text: text || html.replace(/<[^>]+>/g, ''),
    html,
  });

  return { delivered: true, mocked: false, messageId: info.messageId };
}

export async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: 'Verify your SalesPilot AI account',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Welcome to SalesPilot AI, ${name}</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;">Verify Email</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: 'Reset your SalesPilot AI password',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${name}, click the button below to reset your password:</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;">Reset Password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendAppointmentConfirmationEmail({ to, attendeeName, title, startTime, timezone, meetingLink, companyName }) {
  return sendEmail({
    to,
    subject: `Appointment Confirmed: ${title}`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Appointment Confirmed</h2>
        <p>Hi ${attendeeName},</p>
        <p>Your meeting with <strong>${companyName || 'SalesPilot AI'}</strong> is confirmed.</p>
        <ul>
          <li><strong>Topic:</strong> ${title}</li>
          <li><strong>Time:</strong> ${new Date(startTime).toLocaleString('en-US', { timeZone: timezone || 'UTC' })} (${timezone || 'UTC'})</li>
          ${meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></li>` : ''}
        </ul>
      </div>
    `,
  });
}
