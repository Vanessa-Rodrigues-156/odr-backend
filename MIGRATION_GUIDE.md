# Migration Guide for User Data Restructuring

This guide explains how to migrate from the current database schema to the new schema with separate tables for different user types.

## IMPORTANT: Migration Order

The migration **must** follow this exact order:
1. ✅ Backup the database
2. ✅ Extract and save legacy user data (using migrateUserData.ts)
3. ✅ Apply new schema
4. ✅ Update code (signup handler)
5. ✅ Verify migration

The migration script needs to run **before** the schema changes so it can access the deprecated fields.

## Step 1: Backup Your Database

Always backup your database before performing any migration:

```bash
pg_dump -U your_username -d your_database > database_backup.sql
```

## Step 2: Review the New Schema

The new schema creates separate tables for each user type with proper relations:
- `User` table for basic user information
- `Innovator` table for innovator-specific data
- `Mentor` table for mentor-specific data with mentor type enum
- `Faculty` table for faculty-specific data
- `Other` table for other user types

## Step 3: Prepare Data Migration

Run the data migration script to extract user data from the current schema:

```bash
ts-node /run/media/vanessa/Data/Projects/Arch/FullStack/backend/src/scripts/migrateUserData.ts
```

## Step 4: Import Data from Backup

After applying the new schema, run the backup data import script:

```bash
npm run import:backup-data
# or if using bun
bun run import:backup-data
```

This script will read from the AWS RDS backup SQL file and migrate all users to the new schema structure with separate tables for different user types.

## Step 5: Apply the New Schema

The new schema has been applied using migration 20250616174142_new_data_schema_updated_v1.

If you need to manually update the schema.prisma file:

```bash
# The schema.prisma file has been updated to reflect the new structure
npx prisma generate
```

## Step 6: Update the Authentication Handler

Update the signup handler to support the new schema structure. This includes creating records in the appropriate type tables (Innovator, Mentor, Faculty, or Other) based on the user role.

## Step 7: Test the Updated Flow

Test the signup functionality with all user types:
1. Innovator
2. Mentor (all four mentor types)
3. Faculty
4. Other

## Step 8: Update Related API Endpoints

Update any other API endpoints that interact with user data:

1. User profile endpoints
2. User search or listing endpoints
3. Authentication endpoints

## Step 9: Clean Up

After confirming everything works:

1. Remove any temporary files
2. Remove the metadata JSON from the `odrLabUsage` field if needed
3. Update documentation to reflect the new structure

## Rollback Plan

In case of issues, you can revert to the previous schema:

```bash
# Restore database from backup
psql -U your_username -d your_database < database_backup.sql

# Revert code changes
git checkout -- /run/media/vanessa/Data/Projects/Arch/FullStack/backend/prisma/schema.prisma
git checkout -- /run/media/vanessa/Data/Projects/Arch/FullStack/backend/src/api/auth/signup.ts
```

## Schema Changes Summary

1. Added separate tables for each user type:
   - `Innovator`
   - `Mentor`
   - `Faculty`
   - `Other`

2. Added `MentorType` enum with four options:
   - `TECHNICAL_EXPERT`
   - `LEGAL_EXPERT`
   - `ODR_EXPERT`
   - `CONFLICT_RESOLUTION_EXPERT`

3. Established one-to-one relations between `User` and type tables

4. Removed redundant fields from the `User` table

5. Made signup handler store data in appropriate tables based on user type
