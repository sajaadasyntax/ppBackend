# Hierarchical User Category System Documentation

## Overview

The application implements a hierarchical user category system based on administrative divisions. Each user belongs to a specific level in the hierarchy, with permissions and data access scoped accordingly. The system follows the structure:

1. **الأمانة العامة (General Secretariat)** - Top-level authority that can view all data across all levels
2. **الولاية (Region/State)** - Top geographic division
3. **المحلية (Locality)** - Second-level division within a region
4. **الوحدة الادارية (Administrative Unit)** - Third-level division within a locality
5. **الحي (District/Neighborhood)** - Bottom-level division within an administrative unit

## Data Models

### User Model

The User model has been extended to include references to the administrative hierarchy:

```prisma
model User {
  id             String         @id @default(uuid())
  email          String         @unique
  password       String
  role           String         @default("USER")  // Legacy field
  adminLevel     AdminLevel     @default(USER)    // New field for role hierarchy
  
  // Administrative hierarchy references
  regionId       String?        // الولاية
  region         Region?        @relation(fields: [regionId], references: [id])
  localityId     String?        // المحلية
  locality       Locality?      @relation(fields: [localityId], references: [id])
  adminUnitId    String?        // الوحدة الادارية
  adminUnit      AdminUnit?     @relation(fields: [adminUnitId], references: [id])
  districtId     String?        // الحي
  district       District?      @relation(fields: [districtId], references: [id])
  
  // ... other fields
}
```

### Administrative Levels

Four new models have been added to represent the hierarchy:

1. **Region (الولاية)**
2. **Locality (المحلية)**
3. **AdminUnit (الوحدة الادارية)**
4. **District (الحي)**

Each level has relationships to its parent and children levels:
- Regions contain localities
- Localities contain administrative units
- Administrative units contain districts

## Administrative Level Enum

A new `AdminLevel` enum has been created to represent the user's position in the hierarchy:

```prisma
enum AdminLevel {
  GENERAL_SECRETARIAT  // الأمانة العامة - can view all data
  REGION               // الولاية - regional administrator
  LOCALITY             // المحلية - locality administrator
  ADMIN_UNIT           // الوحدة الادارية - administrative unit administrator
  DISTRICT             // الحي - district administrator
  USER                 // Regular user
  ADMIN                // System administrator
}
```

## Access Control

### Access by Hierarchy Level

- **GENERAL_SECRETARIAT**: Access to all data across all regions
- **REGION**: Access to data within their region and all sub-levels
- **LOCALITY**: Access to data within their locality and all sub-levels
- **ADMIN_UNIT**: Access to data within their administrative unit and all sub-levels
- **DISTRICT**: Access to data within their district only
- **USER**: Access to their own data only
- **ADMIN**: Full system access (technical role)

### Authentication and Authorization

The JWT token now includes the user's hierarchical information:

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "USER",                // Legacy role
  "adminLevel": "DISTRICT",      // Hierarchical role
  "regionId": "region-uuid",     // الولاية
  "localityId": "locality-uuid", // المحلية
  "adminUnitId": "unit-uuid",    // الوحدة الادارية
  "districtId": "district-uuid"  // الحي
}
```

### Authorization Middleware

Three middleware functions are available for route protection:

1. `authorize`: Legacy role-based authorization
2. `authorizeRoles`: New administrative level-based authorization
3. `authorizeHierarchy`: Hierarchical access control based on the resource's position in the hierarchy

## API Endpoints

### Hierarchy Management

```
GET    /api/hierarchy/regions                         # Get all regions
GET    /api/hierarchy/regions/:id                     # Get region by ID
POST   /api/hierarchy/regions                         # Create new region
PUT    /api/hierarchy/regions/:id                     # Update region
DELETE /api/hierarchy/regions/:id                     # Delete region

GET    /api/hierarchy/regions/:regionId/localities    # Get localities by region
GET    /api/hierarchy/localities/:id                  # Get locality by ID
POST   /api/hierarchy/localities                      # Create new locality
PUT    /api/hierarchy/localities/:id                  # Update locality
DELETE /api/hierarchy/localities/:id                  # Delete locality

GET    /api/hierarchy/localities/:localityId/admin-units  # Get admin units by locality
GET    /api/hierarchy/admin-units/:id                     # Get admin unit by ID
POST   /api/hierarchy/admin-units                         # Create new admin unit
PUT    /api/hierarchy/admin-units/:id                     # Update admin unit
DELETE /api/hierarchy/admin-units/:id                     # Delete admin unit

GET    /api/hierarchy/admin-units/:adminUnitId/districts  # Get districts by admin unit
GET    /api/hierarchy/districts/:id                       # Get district by ID
POST   /api/hierarchy/districts                           # Create new district
PUT    /api/hierarchy/districts/:id                       # Update district
DELETE /api/hierarchy/districts/:id                       # Delete district

GET    /api/hierarchy/full-hierarchy                      # Get complete hierarchy tree
GET    /api/hierarchy/users                               # Get users by hierarchy level
```

### User Management

The user API now supports filtering by administrative hierarchy:

```
GET /api/users?regionId=X&localityId=Y&adminUnitId=Z&districtId=W
```

## Implementation Details

### Database Migration

To implement this system on an existing database:

1. Run the Prisma migration to add new tables and fields:
   ```
   npx prisma migrate dev --name add-hierarchy-structure
   ```

2. You may need to update existing users to assign them to the appropriate hierarchy levels.

### Seeding Hierarchy Data

Seed data for the administrative hierarchy should be created:

```javascript
// Example seeding script
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  // Create regions
  const khartoumRegion = await prisma.region.create({
    data: {
      name: 'ولاية الخرطوم',
      code: 'KRT',
    }
  });
  
  // Create localities
  const khartoumLocality = await prisma.locality.create({
    data: {
      name: 'محلية الخرطوم',
      code: 'KRT-01',
      regionId: khartoumRegion.id
    }
  });
  
  // Continue with admin units and districts...
}

seed()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Client-Side Implementation

On the client side:

1. Update authentication state to store hierarchy information
2. Implement UI components to navigate and manage the hierarchy
3. Filter views based on the user's position in the hierarchy
4. Update forms to assign users to appropriate hierarchy levels

## Special Cases

### General Secretariat Access

Users with the `GENERAL_SECRETARIAT` admin level have unrestricted access to data across all administrative levels. The authorization middleware automatically grants access to these users for all hierarchy-protected routes.
