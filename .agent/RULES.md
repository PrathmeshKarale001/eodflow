# ⛔ CRITICAL PROJECT RULES — READ BEFORE ANY ACTION

## 🚨 RULE #1: NEVER DELETE OR RESET THE DATABASE

**ABSOLUTELY NEVER run any of the following commands:**

```
prisma db push --force-reset
prisma migrate reset
DROP TABLE
DROP SCHEMA
DELETE FROM (without WHERE clause)
TRUNCATE
```

**This rule has NO exceptions. Not even if:**
- A migration fails
- A schema change requires it
- It "seems easier"
- The user doesn't explicitly say "protect my data"

### What to do instead for schema changes:

1. **Adding a new table/model:** Use `prisma migrate dev --name <name>` or write raw SQL `CREATE TABLE IF NOT EXISTS`
2. **Adding a column:** Use `prisma migrate dev` or `ALTER TABLE ADD COLUMN`
3. **Migration conflicts:** Ask the user. NEVER auto-resolve by resetting.
4. **If `prisma db push` warns about data loss:** STOP. Tell the user. Use `ALTER TABLE` manually instead.

### Why this rule exists:
On 2026-05-20, an AI agent ran `prisma db push --force-reset` which permanently destroyed all production data including user accounts, chat history, projects, tasks, and files. This data was unrecoverable.

---

## RULE #2: Never push to GitHub without explicit user permission

Wait for the user to say "push to github" or similar before running git push.

---

## RULE #3: Always verify before destructive operations

Before running ANY command that modifies or deletes data, files, or state:
1. State what the command will do
2. State what data could be affected
3. Wait for explicit user approval

---

## RULE #4: Schema migrations must be non-destructive

- Use `CREATE TABLE IF NOT EXISTS` for new tables
- Use `ALTER TABLE ... ADD COLUMN` for new columns
- NEVER drop columns, tables, or enums without explicit user approval
- If Prisma CLI wants to reset/drop, STOP and use raw SQL instead
