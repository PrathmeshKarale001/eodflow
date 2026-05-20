# EOD Flow — Agent Instructions

## ⛔ CRITICAL DATABASE RULE (READ FIRST)

**NEVER run any command that resets, drops, or truncates the database.**

Banned commands:
- `prisma db push --force-reset`
- `prisma migrate reset`
- `DROP TABLE` / `DROP SCHEMA` / `TRUNCATE`
- `DELETE FROM` without a specific `WHERE` clause

**For schema changes, use ONLY:**
- `CREATE TABLE IF NOT EXISTS ...` (raw SQL)
- `ALTER TABLE ... ADD COLUMN ...` (raw SQL)  
- `prisma migrate dev --name <name>` (ONLY if it doesn't require a reset)

If Prisma CLI asks to reset the database, **STOP immediately** and use raw SQL instead.

See `.agent/RULES.md` and `prisma/DATABASE_SAFETY.md` for full details.

This rule exists because data was permanently destroyed on 2026-05-20 due to a `--force-reset` command.
