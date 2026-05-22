// =============================================================================
// EOD FLOW — Email Service (Resend Integration)
// Fire-and-forget pattern: email failures never block main operations
// =============================================================================

import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.FROM_EMAIL || "EOD Flow <noreply@eodflow.com>";

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
  const resend = getResend();
  if (!resend) {
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

// ---------------------------------------------------------------------------
// Invitation Email (Magic Link)
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "DIRECTOR",
  ADMIN: "MANAGEMENT",
  EMPLOYEE: "EMPLOYEE",
};

export async function sendInviteEmail(params: {
  to: string;
  name: string;
  invitedBy: string;
  role: string;
  department?: string | null;
  joinUrl: string;
  expiresAt: Date;
}) {
  const roleLabel = ROLE_LABELS[params.role] || params.role;
  const expiryStr = params.expiresAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return sendEmail({
    to: params.to,
    subject: `[EOD Flow] You're invited to join the team`,
    html: wrapTemplate(`
      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; color: #FF3D00; margin: 0 0 16px;">TEAM_INVITE</h2>
      <p style="font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
        Hey <strong>${params.name}</strong>, <strong>${params.invitedBy}</strong> has invited you to <strong>EOD Flow</strong>.
      </p>
      <div style="border: 1px solid #333; padding: 16px; margin: 0 0 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.1em;">ROLE</td>
            <td style="padding: 6px 0; font-size: 13px; color: #FF3D00; text-align: right; font-weight: bold;">${roleLabel}</td>
          </tr>
          ${params.department ? `
          <tr>
            <td style="padding: 6px 0; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; border-top: 1px solid #333;">DEPARTMENT</td>
            <td style="padding: 6px 0; font-size: 13px; color: #fff; text-align: right; border-top: 1px solid #333;">${params.department}</td>
          </tr>
          ` : ""}
        </table>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.joinUrl}" style="display: inline-block; background: #FF3D00; color: #fff; padding: 14px 32px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; font-family: 'JetBrains Mono', 'Courier New', monospace;">
          SET YOUR PASSWORD &rarr;
        </a>
      </div>
      <p style="font-size: 10px; color: #666; text-align: center; margin: 0; letter-spacing: 0.05em;">
        This link expires on ${expiryStr}
      </p>
    `),
  });
}
