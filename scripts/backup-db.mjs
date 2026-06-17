/**
 * EOD Flow — Database Backup Script
 * Exports all data from Supabase PostgreSQL as JSON + SQL schema
 * Usage: node scripts/backup-db.mjs
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔄 Starting database backup...\n');

  const data = {};

  // ── Export each table ──────────────────────────────────────────────────────
  const tables = [
    { name: 'users',                   query: () => prisma.user.findMany() },
    { name: 'accounts',                query: () => prisma.account.findMany() },
    { name: 'sessions',                query: () => prisma.session.findMany() },
    { name: 'verifications',           query: () => prisma.verification.findMany() },
    { name: 'invitations',             query: () => prisma.invitation.findMany() },
    { name: 'departmentChangeRequests',query: () => prisma.departmentChangeRequest.findMany() },
    { name: 'clients',                 query: () => prisma.client.findMany() },
    { name: 'projects',               query: () => prisma.project.findMany() },
    { name: 'projectTemplates',        query: () => prisma.projectTemplate.findMany() },
    { name: 'tasks',                   query: () => prisma.task.findMany() },
    { name: 'subtasks',                query: () => prisma.subtask.findMany() },
    { name: 'tags',                    query: () => prisma.tag.findMany() },
    { name: 'tagsOnTasks',             query: () => prisma.tagsOnTasks.findMany() },
    { name: 'files',                   query: () => prisma.file.findMany() },
    { name: 'comments',               query: () => prisma.comment.findMany() },
    { name: 'timeEntries',            query: () => prisma.timeEntry.findMany() },
    { name: 'activityLogs',           query: () => prisma.activityLog.findMany() },
    { name: 'notifications',          query: () => prisma.notification.findMany() },
    { name: 'pushSubscriptions',      query: () => prisma.pushSubscription.findMany() },
    { name: 'chatChannels',           query: () => prisma.chatChannel.findMany() },
    { name: 'chatChannelMembers',     query: () => prisma.chatChannelMember.findMany() },
    { name: 'chatMessages',           query: () => prisma.chatMessage.findMany() },
    { name: 'chatMessageReactions',   query: () => prisma.chatMessageReaction.findMany() },
  ];

  let totalRecords = 0;

  for (const table of tables) {
    try {
      const rows = await table.query();
      data[table.name] = rows;
      totalRecords += rows.length;
      const icon = rows.length > 0 ? '✅' : '⬜';
      console.log(`  ${icon} ${table.name}: ${rows.length} records`);
    } catch (err) {
      console.log(`  ❌ ${table.name}: ERROR — ${err.message}`);
      data[table.name] = { error: err.message };
    }
  }

  // ── Write JSON data backup ─────────────────────────────────────────────────
  const dataFile = path.join(backupDir, `eod-flow-backup_${timestamp}.json`);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');

  // ── Write summary ──────────────────────────────────────────────────────────
  const summaryFile = path.join(backupDir, `eod-flow-backup_${timestamp}_summary.txt`);
  const summary = [
    `EOD Flow Database Backup`,
    `========================`,
    `Date:    ${new Date().toLocaleString()}`,
    `Tables:  ${tables.length}`,
    `Records: ${totalRecords}`,
    ``,
    `Files:`,
    `  Data:    ${path.basename(dataFile)}`,
    ``,
    `Table Breakdown:`,
    ...Object.entries(data).map(([name, rows]) =>
      Array.isArray(rows)
        ? `  ${name}: ${rows.length} records`
        : `  ${name}: ERROR`
    ),
  ].join('\n');
  fs.writeFileSync(summaryFile, summary, 'utf-8');

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Backup complete!`);
  console.log(`   📦 Total: ${totalRecords} records across ${tables.length} tables`);
  console.log(`   📁 Data:  ${dataFile}`);
  console.log(`   📋 Info:  ${summaryFile}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

backup()
  .catch((err) => {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
