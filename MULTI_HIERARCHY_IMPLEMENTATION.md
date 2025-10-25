# Multi-Hierarchy System Implementation Summary

## Overview
This document summarizes the implementation of the multiple hierarchy systems for the PP application, including:
1. **المستوى القومي (National Level)** - Added above الولاية in the original hierarchy
2. **المغتربين (Expatriates Hierarchy)** - 13 fixed expatriate regions
3. **القطاعات (Sectors Hierarchy)** - 5-level hierarchy with 4 sector types, can be applied to both original and expatriate hierarchies

## Database Schema Changes ✅ COMPLETE

### New Enums
- **AdminLevel** - Extended with:
  - `NATIONAL_LEVEL` - للمستوى القومي
  - `EXPATRIATE_GENERAL` - General admin for expatriates
  - `EXPATRIATE_REGION` - Specific expatriate region admin

- **SectorType** - New enum:
  - `SOCIAL` - الاجتماعي
  - `ECONOMIC` - الاقتصادي
  - `ORGANIZATIONAL` - التنظيمي
  - `POLITICAL` - السياسي

- **ActiveHierarchy** - New enum for user preference:
  - `ORIGINAL` - Original geographic hierarchy
  - `EXPATRIATE` - Expatriate regions hierarchy
  - `SECTOR` - Sectors hierarchy

### New Models

#### Original Hierarchy Enhancement
- **NationalLevel** - New top level above regions with full CRUD support

#### Expatriate Hierarchy
- **ExpatriateRegion** - 13 regions:
  1. قطاع الخليج
  2. قطاع السعودية
  3. قطاع العراق و الشام
  4. قطاع تركيا
  5. قطاع شرق اسيا
  6. قطاع مصر
  7. شرق ووسط افريقيا
  8. قطاع شمال أفريقيا
  9. قطاع افريقيا
  10. قطاع أروبا
  11. قطاع امريكا وكندا
  12. قطاع استراليا
  13. قطاع امريكا الجنوبية

#### Sector Hierarchy
- **SectorNationalLevel** - With sectorType field
- **SectorRegion** - With sectorType field
- **SectorLocality** - With sectorType field
- **SectorAdminUnit** - With sectorType field
- **SectorDistrict** - With sectorType field

All sector models include optional `expatriateRegionId` to link sectors to expatriate regions.

### User Model Updates
- Added `activeHierarchy` field (default: ORIGINAL)
- Added `nationalLevelId` for original hierarchy
- Added `expatriateRegionId` for expatriate hierarchy
- Added sector hierarchy fields:
  - `sectorNationalLevelId`
  - `sectorRegionId`
  - `sectorLocalityId`
  - `sectorAdminUnitId`
  - `sectorDistrictId`
- Added managed relationships for all new admin types

### Content Models Updates
All content models (Bulletin, Survey, VotingItem, Report, SubscriptionPlan) now support targeting:
- Original hierarchy (including new national level)
- Expatriate hierarchy
- Sector hierarchy

All targeting fields are optional, providing maximum flexibility.

## Backend Implementation ✅ COMPLETE

### Services

#### 1. expatriateHierarchyService.js
- `getAllExpatriateRegions()` - Get all expatriate regions
- `getExpatriateRegionById(id)` - Get specific region with details
- `createExpatriateRegion(data)` - Create new region
- `updateExpatriateRegion(id, data)` - Update region
- `deleteExpatriateRegion(id)` - Delete region
- `getUsersByExpatriateRegion(id)` - Get users in region
- `assignUserToExpatriateRegion(userId, regionId)` - Assign user

#### 2. sectorHierarchyService.js
Full CRUD operations for all 5 sector levels:
- Sector National Level
- Sector Region
- Sector Locality
- Sector Admin Unit
- Sector District

Each level supports:
- Filtering by parent level
- Filtering by expatriate region
- Full hierarchy tree retrieval

### Controllers

#### 1. expatriateHierarchyController.js
REST endpoints for expatriate hierarchy management

#### 2. sectorHierarchyController.js
REST endpoints for sector hierarchy management at all levels

#### 3. hierarchyController.js (Updated)
Added national level CRUD operations:
- `getNationalLevels()`
- `getNationalLevelById()`
- `createNationalLevel()`
- `updateNationalLevel()`
- `deleteNationalLevel()`

#### 4. userController.js (Updated)
Added hierarchy management functions:
- `updateActiveHierarchy()` - Switch between ORIGINAL, EXPATRIATE, SECTOR
- `getUserHierarchyMemberships()` - Get user's memberships in all hierarchies

### Routes

#### 1. expatriateHierarchyRoutes.js
```
GET    /api/expatriate-hierarchy/expatriate-regions
GET    /api/expatriate-hierarchy/expatriate-regions/:id
POST   /api/expatriate-hierarchy/expatriate-regions
PUT    /api/expatriate-hierarchy/expatriate-regions/:id
DELETE /api/expatriate-hierarchy/expatriate-regions/:id
GET    /api/expatriate-hierarchy/expatriate-regions/:id/users
PUT    /api/expatriate-hierarchy/users/:userId/expatriate-region
```

#### 2. sectorHierarchyRoutes.js
Full CRUD routes for all 5 sector levels:
```
GET/POST/PUT/DELETE /api/sector-hierarchy/sector-national-levels
GET/POST/PUT/DELETE /api/sector-hierarchy/sector-regions
GET/POST/PUT/DELETE /api/sector-hierarchy/sector-localities
GET/POST/PUT/DELETE /api/sector-hierarchy/sector-admin-units
GET/POST/PUT/DELETE /api/sector-hierarchy/sector-districts
GET                 /api/sector-hierarchy/full-hierarchy
```

#### 3. hierarchyRoutes.js (Updated)
Added national level routes:
```
GET    /api/hierarchy/national-levels
GET    /api/hierarchy/national-levels/:id
POST   /api/hierarchy/national-levels
PUT    /api/hierarchy/national-levels/:id
DELETE /api/hierarchy/national-levels/:id
```

#### 4. userRoutes.js (Updated)
Added hierarchy management routes:
```
PUT /api/users/active-hierarchy
GET /api/users/hierarchy-memberships
```

### Seed Data
Created `prisma/seed-multi-hierarchy.js` which populates:
- 1 National Level (المستوى القومي)
- 13 Expatriate Regions
- Sample sector data for demonstration

## Migration ✅ COMPLETE
- Migration `20251024165605_add_multi_hierarchy_system` created and applied
- Prisma client regenerated
- Seed script executed successfully

## Frontend Implementation 🔄 IN PROGRESS

### Mobile App (new-expo-project/) - TODO

#### API Services
Need to create/update:
1. **expatriateHierarchyApi.ts** - API calls for expatriate hierarchy
2. **sectorHierarchyApi.ts** - API calls for sector hierarchy
3. **userApi.ts** (update) - Add hierarchy switching functions

#### Components
1. **HierarchySelector** - Component to switch between hierarchies
   - Display current active hierarchy
   - Allow selection between ORIGINAL, EXPATRIATE, SECTOR
   - Update backend on change

2. **ExpatriateRegionSelector** - Select expatriate region
3. **SectorSelector** - Select sector with type

#### Screens to Update
Content screens need to respect `activeHierarchy`:
1. Bulletins screen
2. Surveys screen  
3. Voting screen
4. Reports screen
5. User profile screen (show hierarchy memberships)

### Admin Panel (ppAdmin/) - TODO

#### Hierarchy Management UI
1. **National Level Management** - CRUD interface
2. **Expatriate Regions Management** - CRUD interface (mostly read-only since fixed data)
3. **Sector Hierarchy Management** - CRUD interface with:
   - Sector type selection
   - Parent level selection
   - Optional expatriate region linking

#### User Management Updates
1. Assign users to multiple hierarchies
2. Display user's memberships across all hierarchies
3. Set user's default active hierarchy

#### Content Creation Updates
All content creation forms need:
1. Hierarchy type selection (Original/Expatriate/Sector)
2. Appropriate level selectors based on hierarchy type
3. Support for targeting multiple hierarchies simultaneously

## Testing Checklist - TODO

### Backend Testing
- [ ] Test national level CRUD operations
- [ ] Test expatriate region CRUD operations
- [ ] Test sector hierarchy CRUD operations at all levels
- [ ] Test user hierarchy assignment across all systems
- [ ] Test active hierarchy switching
- [ ] Test content filtering by different hierarchies
- [ ] Test admin permissions for new hierarchy types

### Frontend Testing
- [ ] Test hierarchy selector component
- [ ] Test content display respects active hierarchy
- [ ] Test hierarchy switching updates content dynamically
- [ ] Test user can belong to multiple hierarchies
- [ ] Test admin can manage all three hierarchies

### Integration Testing
- [ ] Test content targeting to expatriate regions
- [ ] Test content targeting to sector levels
- [ ] Test sectors linked to expatriate regions
- [ ] Test user sees correct content based on active hierarchy
- [ ] Test hierarchical access control across all systems

## API Documentation

### Active Hierarchy Management

#### Switch Active Hierarchy
```
PUT /api/users/active-hierarchy
Authorization: Bearer <token>
Body: {
  "activeHierarchy": "ORIGINAL" | "EXPATRIATE" | "SECTOR"
}
```

#### Get User Hierarchy Memberships
```
GET /api/users/hierarchy-memberships
Authorization: Bearer <token>

Response: {
  "activeHierarchy": "ORIGINAL",
  "originalHierarchy": {
    "nationalLevel": {...},
    "region": {...},
    "locality": {...},
    "adminUnit": {...},
    "district": {...}
  },
  "expatriateHierarchy": {
    "region": {...}
  },
  "sectorHierarchy": {
    "nationalLevel": {...},
    "region": {...},
    "locality": {...},
    "adminUnit": {...},
    "district": {...}
  }
}
```

## Key Features

### Multi-Hierarchy Support
- Users can belong to multiple hierarchies simultaneously
- Each user has an `activeHierarchy` preference
- Content is filtered based on active hierarchy
- Admin can manage users across all hierarchies

### Flexible Content Targeting
- Content can target any combination of hierarchies
- Optional targeting allows broad or narrow distribution
- Hierarchical inheritance (content at higher levels visible to lower levels)

### Sector-Expatriate Integration
- Sectors can exist independently or under expatriate regions
- Full 5-level hierarchy for each sector type
- 4 sector types per level (Social, Economic, Organizational, Political)

## Notes

### Backward Compatibility
- Existing users maintain their original hierarchy assignments
- Default `activeHierarchy` is `ORIGINAL`
- Existing content targeting continues to work
- All new fields are optional

### Future Enhancements
- Content filtering optimization for performance
- Bulk user assignment to new hierarchies
- Hierarchy migration tools
- Enhanced reporting by hierarchy type
- Mobile push notifications based on active hierarchy

## Files Modified/Created

### Backend Files Created
1. `ppBackend/prisma/seed-multi-hierarchy.js`
2. `ppBackend/src/services/expatriateHierarchyService.js`
3. `ppBackend/src/services/sectorHierarchyService.js`
4. `ppBackend/src/controllers/expatriateHierarchyController.js`
5. `ppBackend/src/controllers/sectorHierarchyController.js`
6. `ppBackend/src/routes/expatriateHierarchyRoutes.js`
7. `ppBackend/src/routes/sectorHierarchyRoutes.js`

### Backend Files Modified
1. `ppBackend/prisma/schema.prisma` - Extensive schema updates
2. `ppBackend/src/controllers/hierarchyController.js` - Added national level functions
3. `ppBackend/src/controllers/userController.js` - Added hierarchy management functions
4. `ppBackend/src/routes/hierarchyRoutes.js` - Added national level routes
5. `ppBackend/src/routes/userRoutes.js` - Added hierarchy management routes
6. `ppBackend/src/app.js` - Registered new routes

### Database
1. Migration: `ppBackend/prisma/migrations/20251024165605_add_multi_hierarchy_system/`
2. Prisma Client regenerated with new models

## Status Summary

✅ **COMPLETE**
- Database schema design and migration
- Backend services and controllers
- REST API endpoints
- Seed data for initial hierarchies
- Active hierarchy switching mechanism

🔄 **IN PROGRESS**
- Mobile app implementation
- Admin panel updates

⏳ **TODO**
- Content filtering updates to respect active hierarchy
- Frontend hierarchy selector UI
- Comprehensive testing
- Documentation updates
- User migration tools (if needed)

## Next Steps

1. **Mobile App Development**
   - Create hierarchy selector component
   - Update API services
   - Modify content screens to respect active hierarchy

2. **Admin Panel Development**
   - Create hierarchy management interfaces
   - Update user assignment forms
   - Update content creation forms

3. **Testing**
   - Unit tests for new services
   - Integration tests for API endpoints
   - End-to-end tests for hierarchy switching

4. **Documentation**
   - API documentation
   - User guides for hierarchy selection
   - Admin guides for hierarchy management

