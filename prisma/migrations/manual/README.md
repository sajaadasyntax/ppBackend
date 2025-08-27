# Hierarchical User Structure Migration

This folder contains migration scripts to implement the hierarchical user category system.

## Migration Steps

1. First, generate and apply the Prisma schema migration:

```bash
cd ppBackend
npx prisma migrate dev --name add-hierarchy-structure
```

2. Run the data migration script to populate initial hierarchy data:

```bash
cd ppBackend
node prisma/migrations/manual/add-hierarchy-structure.js
```

## What the Migration Does

The migration script performs the following actions:

1. Creates a General Secretariat (الأمانة العامة) user with full access across all levels
2. Creates example regions (الولايات)
3. Creates example localities (المحليات) within the first region
4. Creates example administrative units (الوحدات الادارية) within the first locality
5. Creates example districts (الأحياء) within the first administrative unit
6. Creates admin users for each level of the hierarchy
7. Updates a sample of existing regular users to have district associations

## Test Users Created

The migration creates the following test users:

| Email | Password | Role | Level | Access |
|-------|----------|------|-------|--------|
| general-secretariat@example.com | admin123 | GENERAL_SECRETARIAT | الأمانة العامة | All data across all levels |
| region-admin@example.com | admin123 | REGION_ADMIN | الولاية | Data within region and below |
| locality-admin@example.com | admin123 | LOCALITY_ADMIN | المحلية | Data within locality and below |
| adminunit-admin@example.com | admin123 | ADMIN_UNIT_ADMIN | الوحدة الادارية | Data within admin unit and below |
| district-admin@example.com | admin123 | DISTRICT_ADMIN | الحي | Data within district only |

## Important Notes

- The script is idempotent and can be run multiple times without creating duplicate data
- It checks for existing entities before creating new ones
- It updates existing users to fit into the new hierarchy structure
- Default password for test users is 'admin123' - change these in production!
