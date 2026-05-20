# ⛔ DATABASE SAFETY RULES
# 
# NEVER run these commands:
#   - prisma db push --force-reset
#   - prisma migrate reset  
#   - DROP TABLE / DROP SCHEMA / TRUNCATE
#   - DELETE FROM without WHERE
#
# For schema changes, use:
#   - prisma migrate dev --name <name>  (if it works without reset)
#   - Raw SQL: CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN
#   - If Prisma wants to reset, STOP and use raw SQL instead
#
# See .agent/RULES.md for full policy.
# This rule exists because data was permanently lost on 2026-05-20.
