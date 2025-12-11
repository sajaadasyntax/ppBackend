# Test Users and Admins Seed Script

This script creates comprehensive test users and admins across all hierarchy levels for testing purposes.

## Features

- ✅ Creates regular users (adminLevel: USER) across different hierarchies
- ✅ Creates admin users at different hierarchy levels (REGION, LOCALITY, ADMIN_UNIT, DISTRICT, etc.)
- ✅ **Ensures every admin is a user first** - All admins have User records with appropriate role and adminLevel
- ✅ Distributes users across all three hierarchy types:
  - **ORIGINAL** (Geographical: NationalLevel → Region → Locality → AdminUnit → District)
  - **EXPATRIATE** (ExpatriateRegion)
  - **SECTOR** (SectorRegion → SectorLocality → SectorAdminUnit → SectorDistrict)

## Prerequisites

Before running this script, ensure you have:
1. Run the main seed script to create hierarchy entities:
   ```bash
   npm run seed
   ```

This will create:
- National levels, regions, localities, admin units, districts
- Expatriate regions
- Sector hierarchy entities

## Usage

```bash
npm run seed:test-users
```

## Default Credentials

All test users have the same password for easy testing:
- **Password**: `Test@123`

## User Structure

### Admin Levels Created

1. **ADMIN** - Root admin (can manage everything)
2. **GENERAL_SECRETARIAT** - General secretariat admin
3. **NATIONAL_LEVEL** - National level admin
4. **REGION** - Region admins (one per region)
5. **LOCALITY** - Locality admins (one per locality)
6. **ADMIN_UNIT** - Admin unit admins (one per admin unit)
7. **DISTRICT** - District admins (one per district)
8. **EXPATRIATE_GENERAL** - Expatriate general admins
9. **EXPATRIATE_REGION** - Expatriate region admins
10. **USER** - Regular users at all hierarchy levels

### Hierarchy Distribution

#### ORIGINAL Hierarchy (Geographical)
- Users and admins distributed across:
  - National Level
  - Regions (multiple)
  - Localities (multiple per region)
  - Admin Units (multiple per locality)
  - Districts (multiple per admin unit)

#### EXPATRIATE Hierarchy
- Users and admins distributed across:
  - Expatriate Regions (multiple)
  - Expatriate General Admins
  - Expatriate Region Admins
  - Regular Expatriate Users

#### SECTOR Hierarchy
- Users and admins distributed across:
  - Sector Regions
  - Sector Localities
  - Sector Admin Units
  - Sector Districts

## Example Users Created

### ORIGINAL Hierarchy Examples:
- `root.admin@test.com` - Root admin (ADMIN level)
- `region.admin.1@test.com` - Region admin for first region
- `locality.admin.0.0@test.com` - Locality admin for first locality in first region
- `district.user.0.0.0.0@test.com` - Regular user in first district

### EXPATRIATE Hierarchy Examples:
- `expat.general.1@test.com` - Expatriate general admin
- `expat.region.1@test.com` - Expatriate region admin
- `expat.user.1@test.com` - Regular expatriate user

### SECTOR Hierarchy Examples:
- `sector.region.1@test.com` - Sector region admin
- `sector.locality.0.0@test.com` - Sector locality admin
- `sector.district.user.0.0.0.0@test.com` - Regular sector user

## Mobile Numbers Format

Mobile numbers follow a pattern:
- ORIGINAL hierarchy: `+249111111xxx` to `+249999999xxx`
- EXPATRIATE hierarchy: `+249211111xxx` to `+249333333xxx`
- SECTOR hierarchy: `+249411111xxx` to `+249488888xxx`

## Important Notes

1. **All Admins are Users First**: Every admin account is created as a User record first, then assigned the appropriate `adminLevel` and `role` fields.

2. **Role vs AdminLevel**:
   - `role` field: 'ADMIN' for admins, 'USER' for regular users
   - `adminLevel` field: Specific hierarchy level (REGION, LOCALITY, ADMIN_UNIT, DISTRICT, USER, etc.)

3. **Hierarchy Assignment**: After creating users, the script automatically assigns admins to their respective hierarchy entities (e.g., region admins are assigned to their regions).

4. **Active Hierarchy**: Each user has an `activeHierarchy` field indicating which hierarchy they primarily belong to (ORIGINAL, EXPATRIATE, or SECTOR).

## Verification

After running the script, you can verify the users were created:

```bash
# Check total user count
npx prisma studio
# Or use SQL:
# SELECT adminLevel, COUNT(*) FROM "User" GROUP BY adminLevel;
```

## Troubleshooting

If you encounter errors:
1. Ensure the main seed script has been run first (`npm run seed`)
2. Check that hierarchy entities exist in the database
3. Verify database connection in `.env` file
