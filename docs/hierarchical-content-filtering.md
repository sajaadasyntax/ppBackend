# Hierarchical Content Filtering

This document explains how the hierarchical content filtering system works in the platform, ensuring that content appears only to users within the relevant administrative hierarchy.

## Overview

The system implements a hierarchical content filtering mechanism where content (bulletins, surveys, voting items, reports) is targeted to specific levels of the administrative hierarchy and only appears to users within that hierarchy.

## Administrative Hierarchy

The Sudan administrative hierarchy is structured as follows:

```
Region (الولاية) 
└── Locality (المحلية)
    └── Administrative Unit (الوحدة الإدارية)
        └── District (الحي)
```

## How Content Filtering Works

### Content Targeting

Each piece of content can be targeted to one of four levels:

1. **Region Level**: Content appears to all users in the region and its child areas
2. **Locality Level**: Content appears to all users in the locality and its child areas
3. **Administrative Unit Level**: Content appears to all users in the admin unit and its child areas
4. **District Level**: Content appears only to users in that specific district
5. **Global Content**: Content with no targeting appears to all users

### User Visibility Rules

Users see content based on their position in the hierarchy:

- **District Users**: See content targeted to their district, admin unit, locality, region, and global content
- **Admin Unit Users**: See content targeted to their admin unit, locality, region, and global content
- **Locality Users**: See content targeted to their locality, region, and global content
- **Region Users**: See content targeted to their region and global content

### Example Scenarios

#### Scenario 1: Khartoum Region Bulletin
- **Target**: Khartoum Region
- **Visible to**: All users in Khartoum region (including all localities, admin units, and districts within Khartoum)
- **Not visible to**: Users in other regions (e.g., North Darfur, Blue Nile)

#### Scenario 2: Burri District Voting
- **Target**: Burri District
- **Visible to**: Only users specifically assigned to Burri District
- **Not visible to**: Users in other districts, even within the same admin unit

#### Scenario 3: Global Survey
- **Target**: No specific hierarchy (global)
- **Visible to**: All users across all regions

## Database Schema

### Content Models with Hierarchy Fields

Each content model includes these optional targeting fields:

```prisma
model Bulletin {
  // ... other fields
  targetRegionId     String?  
  targetRegion       Region?  @relation(fields: [targetRegionId], references: [id])
  targetLocalityId   String?  
  targetLocality     Locality? @relation(fields: [targetLocalityId], references: [id])
  targetAdminUnitId  String?  
  targetAdminUnit    AdminUnit? @relation(fields: [targetAdminUnitId], references: [id])
  targetDistrictId   String?  
  targetDistrict     District? @relation(fields: [targetDistrictId], references: [id])
}
```

### User Hierarchy Assignment

Users are assigned to their most specific administrative level:

```prisma
model User {
  // ... other fields
  regionId       String?    // الولاية
  localityId     String?    // المحلية  
  adminUnitId    String?    // الوحدة الإدارية
  districtId     String?    // الحي
}
```

## API Implementation

### HierarchyService

The `HierarchyService` provides methods for:

- `buildContentFilter(user)`: Creates Prisma WHERE clause for filtering content
- `getUserBulletins(userId)`: Gets bulletins visible to a specific user
- `getUserSurveys(userId)`: Gets surveys visible to a specific user
- `getUserVotingItems(userId)`: Gets voting items visible to a specific user
- `getAdminReports(adminId)`: Gets reports visible to an admin based on their managed areas

### Content Controller Updates

Content controllers now use the hierarchy service:

```javascript
// Get bulletins filtered by user hierarchy
exports.getBulletins = async (req, res) => {
  const userId = req.user.id;
  const bulletins = await HierarchyService.getUserBulletins(userId);
  res.json(bulletins);
};
```

### Automatic Hierarchy Targeting

When creating content, the system automatically determines targeting based on the user's position:

```javascript
// Add hierarchy targeting based on user's position
const user = await HierarchyService.getUserWithHierarchy(req.user.id);
if (user) {
  const hierarchyTarget = HierarchyService.determineContentHierarchy(user);
  Object.assign(contentData, hierarchyTarget);
}
```

## Content Creation Examples

### Creating a Region-wide Bulletin

```json
{
  "title": "إعلان هام لولاية الخرطوم",
  "content": "إعلان يخص جميع سكان ولاية الخرطوم...",
  "targetRegionId": "khartoum-region-id"
}
```

### Creating a District-specific Voting Item

```json
{
  "title": "التصويت على موقع الحديقة الجديدة",
  "description": "اختر الموقع المفضل للحديقة في حي البري",
  "targetDistrictId": "burri-district-id",
  "options": [...]
}
```

## Admin Report Management

Admins can only see reports from areas they manage:

- **Region Admins**: See reports from their region and all child areas
- **Locality Admins**: See reports from their locality and all child areas
- **Admin Unit Admins**: See reports from their admin unit and all child areas
- **District Admins**: See reports only from their district

## Migration

To update existing databases, run the manual migration:

```sql
-- Add hierarchy targeting fields
ALTER TABLE "Bulletin" ADD COLUMN "targetRegionId" TEXT;
ALTER TABLE "Survey" ADD COLUMN "targetRegionId" TEXT;
-- ... (see migration file for complete script)
```

## API Endpoints

### Get Hierarchy Targeting Options

```
GET /api/content/hierarchy/targeting-options
```

Returns available hierarchy options for content creation based on user's admin level.

### Content Endpoints (All Now Hierarchy-Filtered)

- `GET /api/content/bulletins` - Returns bulletins visible to user
- `GET /api/content/surveys/public` - Returns surveys visible to user  
- `GET /api/content/voting` - Returns voting items visible to user
- `GET /api/content/reports` - Returns reports visible to admin

## Benefits

1. **Targeted Communication**: Content reaches only relevant users
2. **Improved User Experience**: Users see only content relevant to their area
3. **Administrative Efficiency**: Admins manage content for their specific areas
4. **Scalability**: System works across all administrative levels
5. **Privacy**: Sensitive local content doesn't leak to other areas

## Future Enhancements

- **Multi-level Targeting**: Allow content to target multiple areas simultaneously
- **Inheritance Control**: Fine-tune which child levels see parent-targeted content
- **Content Analytics**: Track engagement by administrative level
- **Notification Targeting**: Apply hierarchy filtering to push notifications
