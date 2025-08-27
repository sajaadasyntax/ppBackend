# Admin Hierarchy Management

This document provides information about the admin-specific API endpoints for managing the hierarchical structure of user categories.

## Overview

Root admin users (with `ADMIN` or `GENERAL_SECRETARIAT` roles) have special privileges to manage all levels of the hierarchical structure, including:

1. Creating, updating, and deleting regions (الولاية)
2. Creating, updating, and deleting localities (المحلية)
3. Creating, updating, and deleting administrative units (الوحدة الادارية)
4. Creating, updating, and deleting districts (الحي)

## Admin API Endpoints

All endpoints are restricted to users with `ADMIN` or `GENERAL_SECRETARIAT` roles.

### Base URL

```
/api/admin/hierarchy
```

### Hierarchy Overview

```
GET /api/admin/hierarchy/overview
```

Returns statistics and recent items across all hierarchy levels.

**Response Example:**

```json
{
  "counts": {
    "regions": 5,
    "localities": 15,
    "adminUnits": 45,
    "districts": 120,
    "users": 500
  },
  "recentItems": {
    "regions": [...],
    "localities": [...],
    "adminUnits": [...],
    "districts": [...]
  }
}
```

### Bulk Operations for Regions

```
POST /api/admin/hierarchy/regions/bulk
```

Create multiple regions in a single request.

**Request Body:**

```json
{
  "regions": [
    {
      "name": "ولاية الخرطوم",
      "code": "KRT",
      "description": "عاصمة السودان"
    },
    {
      "name": "ولاية الجزيرة",
      "code": "JZR",
      "description": "ولاية الجزيرة"
    }
  ]
}
```

### Bulk Operations for Localities

```
POST /api/admin/hierarchy/localities/bulk
```

Create multiple localities for a region in a single request.

**Request Body:**

```json
{
  "regionId": "region-uuid",
  "localities": [
    {
      "name": "محلية الخرطوم",
      "code": "KRT-01",
      "description": "محلية الخرطوم"
    },
    {
      "name": "محلية بحري",
      "code": "KRT-02",
      "description": "محلية بحري"
    }
  ]
}
```

### Bulk Operations for Administrative Units

```
POST /api/admin/hierarchy/admin-units/bulk
```

Create multiple administrative units for a locality in a single request.

**Request Body:**

```json
{
  "localityId": "locality-uuid",
  "adminUnits": [
    {
      "name": "وحدة الخرطوم الشرقية",
      "code": "KRT-01-01",
      "description": "وحدة الخرطوم الشرقية"
    },
    {
      "name": "وحدة الخرطوم الغربية",
      "code": "KRT-01-02",
      "description": "وحدة الخرطوم الغربية"
    }
  ]
}
```

### Bulk Operations for Districts

```
POST /api/admin/hierarchy/districts/bulk
```

Create multiple districts for an administrative unit in a single request.

**Request Body:**

```json
{
  "adminUnitId": "admin-unit-uuid",
  "districts": [
    {
      "name": "حي الرياض",
      "code": "KRT-01-01-01",
      "description": "حي الرياض"
    },
    {
      "name": "حي الصحافة",
      "code": "KRT-01-01-02",
      "description": "حي الصحافة"
    }
  ]
}
```

### Bulk Import Entire Hierarchy

```
POST /api/admin/hierarchy/import
```

Import a complete hierarchy structure in a single operation.

**Request Body:**

```json
{
  "format": "json",
  "data": {
    "regions": [
      {
        "name": "ولاية الخرطوم",
        "code": "KRT",
        "description": "عاصمة السودان",
        "localities": [
          {
            "name": "محلية الخرطوم",
            "code": "KRT-01",
            "description": "محلية الخرطوم",
            "adminUnits": [
              {
                "name": "وحدة الخرطوم الشرقية",
                "code": "KRT-01-01",
                "description": "وحدة الخرطوم الشرقية",
                "districts": [
                  {
                    "name": "حي الرياض",
                    "code": "KRT-01-01-01",
                    "description": "حي الرياض"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Authentication and Authorization

All admin hierarchy endpoints require a valid JWT token with either `ADMIN` or `GENERAL_SECRETARIAT` role. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Importing from External Sources

The bulk import endpoint supports importing hierarchical data from:

1. JSON format: A structured JSON object with regions, localities, administrative units, and districts
2. CSV format (planned feature): Import from a CSV file with a specific format

## Error Handling

All endpoints follow a consistent error format:

```json
{
  "error": "Error message",
  "details": "Additional error details (if available)"
}
```

Common error codes:
- 400: Bad Request (invalid input data)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource not found)
- 500: Internal Server Error

## Example: Creating a Complete Hierarchy

To create a complete hierarchy, an admin would:

1. Create regions using the bulk regions endpoint
2. Create localities for each region using the bulk localities endpoint
3. Create administrative units for each locality using the bulk admin units endpoint
4. Create districts for each administrative unit using the bulk districts endpoint

Alternatively, they can use the bulk import endpoint to create the entire hierarchy in one request.

## Benefits for Root Admins

1. **Efficiency**: Create multiple entities at once
2. **Consistency**: Ensure hierarchy integrity
3. **Flexibility**: Import data from external sources
4. **Control**: Manage the entire organizational structure from a single interface

The admin hierarchy management system provides a powerful toolset for root administrators to efficiently manage the entire organizational structure while maintaining the integrity of the hierarchical relationships.
