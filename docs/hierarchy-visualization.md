# Hierarchical Structure Visualization

The following diagram illustrates the administrative hierarchy structure and access model:

```mermaid
graph TD
    GS[الأمانة العامة<br/>General Secretariat] --- AA[System Admin]
    GS --> R1[الولاية<br/>Region 1]
    GS --> R2[الولاية<br/>Region 2]
    GS --> R3[الولاية<br/>Region n...]
    
    R1 --> L1[المحلية<br/>Locality 1]
    R1 --> L2[المحلية<br/>Locality 2]
    R1 --> L3[المحلية<br/>Locality n...]
    
    L1 --> A1[الوحدة الادارية<br/>Admin Unit 1]
    L1 --> A2[الوحدة الادارية<br/>Admin Unit 2]
    L1 --> A3[الوحدة الادارية<br/>Admin Unit n...]
    
    A1 --> D1[الحي<br/>District 1]
    A1 --> D2[الحي<br/>District 2]
    A1 --> D3[الحي<br/>District n...]
    
    subgraph "Access Hierarchy"
        U1[GENERAL_SECRETARIAT<br/>Access All Data]
        U2[REGION ADMIN<br/>Access Region Data]
        U3[LOCALITY ADMIN<br/>Access Locality Data]
        U4[ADMIN UNIT ADMIN<br/>Access Admin Unit Data]
        U5[DISTRICT ADMIN<br/>Access District Data]
        U6[USER<br/>Access Personal Data]
    end
```

## Key Points

1. **الأمانة العامة (General Secretariat)** sits at the top level and has visibility across all administrative levels
2. **الولاية (Region)** is the top geographic division
3. **المحلية (Locality)** is contained within a Region
4. **الوحدة الادارية (Administrative Unit)** is contained within a Locality
5. **الحي (District)** is the lowest level division contained within an Administrative Unit
6. Users at each level have access to their own level and all levels below them in the hierarchy
7. Regular users are associated with a specific district and can only access their personal data

## Data Access Pattern

- Users with GENERAL_SECRETARIAT role can view all data
- Users with REGION role can view data for their region and all its sub-levels
- Users with LOCALITY role can view data for their locality and all its sub-levels
- Users with ADMIN_UNIT role can view data for their administrative unit and all its sub-levels
- Users with DISTRICT role can view data for their district only
- Regular users can only access their personal data

## Implementation Notes

The hierarchical structure is implemented in the database schema with foreign key relationships between the levels, and the authorization system checks these relationships when determining access permissions.
