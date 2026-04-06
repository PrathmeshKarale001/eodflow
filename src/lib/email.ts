// =============================================================================
// EOD FLOW — Email Service (Resend Integration)
// Fire-and-forget pattern: email failures never block main operations
// =============================================================================

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "EOD Flow <noreply@eodflow.com>";

// ---------------------------------------------------------------------------
// Core send function (fire-and-forget)
// ---------------------------------------------------------------------------

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not set, skipping email");
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return result;
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

function wrapTemplate(content: string) {
  return `
    <div style="font-family: 'JetBrains Mono', 'Courier New', monospace; background: #0a0a0a; color: #e0e0e0; padding: 32px;">
      <div style="max-width: 560px; margin: 0 auto;">
        <div style="border: 2px solid #333; padding: 24px;">
          <div style="border-bottom: 1px solid #333; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #FF3D00;">EOD_FLOW</span>
          </div>
          ${content}
          <div style="border-top: 1px solid #333; padding-top: 16px; margin-top: 24px;">
            <span style="font-size: 10px; color: #666; letter-spacing: 0.1em;">SYSTEM_NOTIFICATION — DO NOT REPLY</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Notification Emails
// ---------------------------------------------------------------------------

export async function sendTaskAssignedEmail(params: {
  to: string;
  taskTitle: string;
  projectTitle: string;
  assignedBy: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `[EOD Flow] Task assigned: ${params.taskTitle}`,
    html: wrapTemplate(`
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; color: #FF3D00; margin: 0 0 16px;">TASK_ASSIGNED</h2>
      <p style="font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
        <strong>${params.assignedBy}</strong> assigned you a task:
      </p>
      <p style="font-size: 14px; color: #fff; margin: 0 0 8px;">"${params.taskTitle}"</p>
      <p style="font-size: 11px; color: #888; margin: 0;">Project: ${params.projectTitle}</p>
    `),
  });
}

export async function sendCommentMentionEmail(params: {
  to: string;
  mentionedBy: string;
  taskTitle: string;
  commentPreview: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `[EOD Flow] ${params.mentionedBy} mentioned you`,
    html: wrapTemplate(`
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; color: #FF3D00; margin: 0 0 16px;">MENTION</h2>
      <p style="font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
        <strong>${params.mentionedBy}</strong> mentioned you in a comment on:
      </p>
      <p style="font-size: 14px; color: #fff; margin: 0 0 12px;">"${params.taskTitle}"</p>
      <div style="border-left: 2px solid #FF3D00; padding-left: 12px; margin: 0 0 8px;">
        <p style="font-size: 12px; color: #ccc; margin: 0; font-style: italic;">"${params.commentPreview}"</p>
      </div>
    `),
  });
}

export async function sendDeadlineReminderEmail(params: {
  to: string;
  taskTitle: string;
  dueDate: string;
  projectTitle: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `[EOD Flow] Deadline approaching: ${params.taskTitle}`,
    html: wrapTemplate(`
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; color: #FFC107; margin: 0 0 16px;">⚠ DEADLINE_WARNING</h2>
      <p style="font-size: 13px; line-height: 1.6; margin: 0 0 8px;">
        The following task has an upcoming deadline:
      </p>
      <p style="font-size: 14px; color: #fff; margin: 0 0 8px;">"${params.taskTitle}"</p>
      <p style="font-size: 12px; color: #FFC107; margin: 0 0 4px;">Due: ${params.dueDate}</p>
      <p style="font-size: 11px; color: #888; margin: 0;">Project: ${params.projectTitle}</p>
    `),
  });
}

export async function sendDailyDigestEmail(params: {
  to: string;
  userName: string;
  tasksDue: number;
  commentsCount: number;
  date: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `[EOD Flow] Daily Summary — ${params.date}`,
    html: wrapTemplate(`
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; color: #FF3D00; margin: 0 0 16px;">DAILY_DIGEST</h2>
      <p style="font-size: 13px; margin: 0 0 16px;">Hey ${params.userName}, here's your summary for ${params.date}:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #333; font-size: 12px; color: #888;">Tasks Due Today</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #333; font-size: 14px; color: #fff; text-align: right;">${params.tasksDue}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 12px; color: #888;">New Comments</td>
          <td style="padding: 8px 0; font-size: 14px; color: #fff; text-align: right;">${params.commentsCount}</td>
        </tr>
      </table>
    `),
  });
}
