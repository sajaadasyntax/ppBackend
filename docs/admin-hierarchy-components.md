# Admin Hierarchy Management Components

This document explains how to use the admin hierarchy management components for managing Sudan's administrative structure and creating users with hierarchy assignments.

## Components Overview

### 1. HierarchyManagement.jsx
A comprehensive admin interface for managing the administrative hierarchy (regions, localities, admin units, districts).

### 2. HierarchySelector.jsx
A reusable component for step-by-step hierarchy selection used in user creation and editing.

### 3. CreateUserWithHierarchy.jsx
A complete user creation form that includes hierarchy assignment.

## Installation and Setup

### Prerequisites
- React 18+
- Material-UI (MUI) v5
- Valid authentication token in localStorage

### Required MUI Components
```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### Import Components
```jsx
import HierarchyManagement from './components/HierarchyManagement';
import HierarchySelector from './components/HierarchySelector';
import CreateUserWithHierarchy from './components/CreateUserWithHierarchy';
```

## Usage Examples

### HierarchyManagement Component

```jsx
import React from 'react';
import HierarchyManagement from './components/HierarchyManagement';

const AdminPanel = () => {
  return (
    <div>
      <h1>Admin Panel</h1>
      <HierarchyManagement />
    </div>
  );
};
```

**Features:**
- View complete hierarchy tree with statistics
- Add/Edit/Delete regions, localities, admin units, and districts
- Hierarchical validation (can't delete items with children)
- Real-time user count display
- Search and filtering capabilities

### HierarchySelector Component

```jsx
import React, { useState } from 'react';
import HierarchySelector from './components/HierarchySelector';

const UserForm = () => {
  const [hierarchySelection, setHierarchySelection] = useState({
    hierarchyLevel: 'none',
    regionId: null,
    localityId: null,
    adminUnitId: null,
    districtId: null
  });

  const handleHierarchyChange = (selection) => {
    setHierarchySelection(selection);
    console.log('Selected hierarchy:', selection);
  };

  return (
    <HierarchySelector
      value={hierarchySelection}
      onChange={handleHierarchyChange}
      label="Select User's Administrative Area"
      allowedLevels={['region', 'locality', 'adminUnit', 'district']}
      showNoneOption={true}
      required={false}
    />
  );
};
```

**Props:**
- `value`: Current selection object
- `onChange`: Callback when selection changes
- `label`: Display label for the component
- `allowedLevels`: Array of allowed hierarchy levels
- `showNoneOption`: Whether to show "No Hierarchy" option
- `required`: Whether selection is required

### CreateUserWithHierarchy Component

```jsx
import React from 'react';
import CreateUserWithHierarchy from './components/CreateUserWithHierarchy';

const UserManagement = () => {
  const handleUserCreated = (newUser) => {
    console.log('New user created:', newUser);
    // Refresh user list, show success message, etc.
  };

  const handleCancel = () => {
    // Navigate back or close dialog
    console.log('User creation cancelled');
  };

  return (
    <CreateUserWithHierarchy
      onUserCreated={handleUserCreated}
      onCancel={handleCancel}
    />
  );
};
```

**Props:**
- `onUserCreated`: Callback when user is successfully created
- `onCancel`: Callback when user cancels creation

## API Integration

### Required Endpoints

The components expect the following API endpoints to be available:

#### Hierarchy Management Endpoints
```
GET    /api/hierarchy-management/tree
GET    /api/hierarchy-management/stats
POST   /api/hierarchy-management/regions
PUT    /api/hierarchy-management/regions/:id
DELETE /api/hierarchy-management/regions/:id
POST   /api/hierarchy-management/localities
PUT    /api/hierarchy-management/localities/:id
DELETE /api/hierarchy-management/localities/:id
POST   /api/hierarchy-management/admin-units
PUT    /api/hierarchy-management/admin-units/:id
DELETE /api/hierarchy-management/admin-units/:id
POST   /api/hierarchy-management/districts
PUT    /api/hierarchy-management/districts/:id
DELETE /api/hierarchy-management/districts/:id
```

#### User Creation Hierarchy Endpoints
```
GET /api/users/hierarchy/regions
GET /api/users/hierarchy/regions/:regionId/localities
GET /api/users/hierarchy/localities/:localityId/admin-units
GET /api/users/hierarchy/admin-units/:adminUnitId/districts
POST /api/users/with-hierarchy
```

### Authentication

All API calls require a Bearer token in the Authorization header:
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

## Component Features

### HierarchyManagement Features

1. **Statistics Dashboard**
   - Total counts for each hierarchy level
   - User distribution across hierarchy
   - Active/inactive status tracking

2. **Hierarchy Tree View**
   - Expandable/collapsible tree structure
   - Visual icons for each level
   - User count badges
   - Edit/delete actions

3. **CRUD Operations**
   - Create new items at any level
   - Edit existing items
   - Soft delete (deactivation)
   - Validation for dependencies

4. **Real-time Updates**
   - Automatic refresh after operations
   - Success/error notifications
   - Loading states

### HierarchySelector Features

1. **Step-by-step Selection**
   - Progressive disclosure of options
   - Automatic loading of child options
   - Clear visual hierarchy

2. **Flexible Configuration**
   - Configurable allowed levels
   - Optional "none" selection
   - Custom labels and validation

3. **User Experience**
   - Loading indicators
   - Error handling
   - Selection summary
   - Path breadcrumbs

### CreateUserWithHierarchy Features

1. **Complete User Form**
   - Basic user information
   - Role and permission settings
   - Hierarchy assignment
   - Form validation

2. **Integrated Hierarchy Selection**
   - Embedded HierarchySelector
   - Real-time validation
   - Selection summary

3. **Form Management**
   - Auto-save capabilities
   - Reset functionality
   - Error handling
   - Success notifications

## Customization

### Styling
All components use Material-UI theming. Customize appearance by:

```jsx
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

<ThemeProvider theme={theme}>
  <HierarchyManagement />
</ThemeProvider>
```

### Icons
Customize hierarchy level icons by modifying the `getIcon` function:

```jsx
const getIcon = (type) => {
  const icons = {
    region: <CustomRegionIcon />,
    locality: <CustomLocalityIcon />,
    adminUnit: <CustomAdminUnitIcon />,
    district: <CustomDistrictIcon />
  };
  return icons[type] || <DefaultIcon />;
};
```

### Validation
Add custom validation rules:

```jsx
const validateForm = () => {
  const errors = [];
  
  // Custom validation logic
  if (customCondition) {
    errors.push('Custom error message');
  }
  
  return errors;
};
```

## Error Handling

Components handle common error scenarios:

1. **Network Errors**: Displays user-friendly messages
2. **Authentication Errors**: Redirects to login
3. **Validation Errors**: Shows field-specific errors
4. **Permission Errors**: Disables unauthorized actions

## Performance Optimization

1. **Lazy Loading**: Child options loaded on demand
2. **Caching**: API responses cached where appropriate
3. **Debouncing**: Search inputs debounced
4. **Virtual Scrolling**: For large lists (if needed)

## Accessibility

Components follow WCAG guidelines:

1. **Keyboard Navigation**: Full keyboard support
2. **Screen Readers**: Proper ARIA labels
3. **Focus Management**: Logical tab order
4. **Color Contrast**: Meets AA standards

## Testing

### Unit Tests Example
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import HierarchySelector from './HierarchySelector';

test('renders hierarchy selector', () => {
  render(<HierarchySelector onChange={() => {}} />);
  expect(screen.getByText('Select Administrative Hierarchy')).toBeInTheDocument();
});

test('handles level selection', () => {
  const mockOnChange = jest.fn();
  render(<HierarchySelector onChange={mockOnChange} />);
  
  fireEvent.click(screen.getByLabelText('Region Level'));
  expect(mockOnChange).toHaveBeenCalledWith({
    hierarchyLevel: 'region',
    regionId: null,
    localityId: null,
    adminUnitId: null,
    districtId: null
  });
});
```

## Troubleshooting

### Common Issues

1. **Components not loading data**
   - Check API endpoints are running
   - Verify authentication token
   - Check console for errors

2. **Hierarchy selection not working**
   - Ensure parent selections are made first
   - Check network requests in browser dev tools
   - Verify API responses

3. **Styling issues**
   - Ensure Material-UI is properly installed
   - Check theme configuration
   - Verify CSS imports

### Debug Mode
Enable debug logging:

```jsx
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Hierarchy selection:', selection);
}
```

## Future Enhancements

1. **Bulk Operations**: Multi-select and bulk actions
2. **Import/Export**: CSV import/export functionality
3. **Audit Trail**: Change history tracking
4. **Advanced Search**: Complex filtering options
5. **Mobile Optimization**: Responsive design improvements
