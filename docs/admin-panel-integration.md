# Admin Panel Hierarchy Management Integration

This guide explains how to integrate the hierarchy management components into your admin panel.

## Components Overview

### 1. AdminPanelHierarchyPage.jsx (Main Integration Component)
The main admin panel page that combines all hierarchy management functionality with a tabbed interface.

### 2. AdminHierarchyPage.jsx (Complete Management)
Comprehensive interface with statistics, tree view, and full CRUD operations.

### 3. HierarchyValuesManager.jsx (Level-by-Level Management)
Simplified interface focused on adding values to specific hierarchy levels.

### 4. QuickAddHierarchy.jsx (Wizard Interface)
Step-by-step wizard for creating complete hierarchy paths.

## Integration Options

### Option 1: Full Integration (Recommended)
Use the `AdminPanelHierarchyPage` component which includes all functionality:

```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminPanelHierarchyPage from './components/AdminPanelHierarchyPage';

const AdminPanel = () => {
  return (
    <Routes>
      <Route path="/hierarchy" element={<AdminPanelHierarchyPage />} />
      {/* Other admin routes */}
    </Routes>
  );
};
```

### Option 2: Individual Components
Use specific components for different use cases:

```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminHierarchyPage from './components/AdminHierarchyPage';
import HierarchyValuesManager from './components/HierarchyValuesManager';
import QuickAddHierarchy from './components/QuickAddHierarchy';

const AdminPanel = () => {
  return (
    <Routes>
      <Route path="/hierarchy/overview" element={<AdminHierarchyPage />} />
      <Route path="/hierarchy/manage" element={<HierarchyValuesManager />} />
      <Route path="/hierarchy/quick-add" element={<QuickAddHierarchy />} />
    </Routes>
  );
};
```

### Option 3: Embedded Components
Embed components within existing admin layouts:

```jsx
import React from 'react';
import { Box, Grid } from '@mui/material';
import HierarchyValuesManager from './components/HierarchyValuesManager';
import AdminDashboard from './AdminDashboard';

const AdminHome = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <AdminDashboard />
      </Grid>
      <Grid item xs={12} md={4}>
        <HierarchyValuesManager />
      </Grid>
    </Grid>
  );
};
```

## Admin Panel Menu Integration

### Add to Navigation Menu
```jsx
const adminMenuItems = [
  {
    title: 'Dashboard',
    path: '/admin/dashboard',
    icon: <DashboardIcon />
  },
  {
    title: 'Hierarchy Management',
    path: '/admin/hierarchy',
    icon: <BusinessIcon />,
    children: [
      {
        title: 'Overview',
        path: '/admin/hierarchy/overview',
        description: 'Complete management interface'
      },
      {
        title: 'Manage Values',
        path: '/admin/hierarchy/manage',
        description: 'Add hierarchy values by level'
      },
      {
        title: 'Quick Add',
        path: '/admin/hierarchy/quick-add',
        description: 'Step-by-step creation wizard'
      }
    ]
  },
  {
    title: 'User Management',
    path: '/admin/users',
    icon: <PeopleIcon />
  }
];
```

### Material-UI Drawer Implementation
```jsx
import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  ListItemButton
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';

const AdminSidebar = () => {
  const [hierarchyOpen, setHierarchyOpen] = useState(false);

  return (
    <Drawer variant="permanent">
      <List>
        {/* Other menu items */}
        
        <ListItemButton onClick={() => setHierarchyOpen(!hierarchyOpen)}>
          <ListItemIcon>
            <BusinessIcon />
          </ListItemIcon>
          <ListItemText primary="Hierarchy Management" />
          {hierarchyOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        <Collapse in={hierarchyOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/admin/hierarchy/overview')}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Overview" 
                secondary="Complete management"
              />
            </ListItemButton>
            
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/admin/hierarchy/manage')}>
              <ListItemIcon>
                <ListIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Manage Values" 
                secondary="Add by hierarchy level"
              />
            </ListItemButton>
            
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate('/admin/hierarchy/quick-add')}>
              <ListItemIcon>
                <SpeedIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Quick Add" 
                secondary="Step-by-step wizard"
              />
            </ListItemButton>
          </List>
        </Collapse>
      </List>
    </Drawer>
  );
};
```

## Permission-Based Access

### Role-Based Component Loading
```jsx
import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Alert, Box } from '@mui/material';

const ProtectedHierarchyPage = () => {
  const { user, hasPermission } = useAuth();

  if (!hasPermission(['ADMIN', 'GENERAL_SECRETARIAT'])) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You don't have permission to access hierarchy management.
        </Alert>
      </Box>
    );
  }

  // Different access levels
  if (hasPermission(['GENERAL_SECRETARIAT', 'ADMIN'])) {
    // Full access - show all components
    return <AdminPanelHierarchyPage />;
  } else if (hasPermission(['REGION'])) {
    // Limited access - only their region
    return <HierarchyValuesManager allowedLevels={['locality', 'adminUnit', 'district']} />;
  } else {
    // View only
    return <AdminHierarchyPage readOnly={true} />;
  }
};
```

### Feature Flags
```jsx
const HierarchyManagement = () => {
  const { user } = useAuth();
  
  const features = {
    canCreateRegions: user.adminLevel === 'GENERAL_SECRETARIAT',
    canEditAll: ['ADMIN', 'GENERAL_SECRETARIAT'].includes(user.adminLevel),
    canDelete: user.adminLevel === 'ADMIN',
    quickAddEnabled: true,
    bulkImport: user.adminLevel === 'ADMIN'
  };

  return (
    <AdminPanelHierarchyPage 
      features={features}
      userLevel={user.adminLevel}
    />
  );
};
```

## Styling and Theming

### Custom Theme Integration
```jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';

const adminTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue for regions
    },
    secondary: {
      main: '#dc004e', // Red for localities
    },
    info: {
      main: '#0288d1', // Light blue for admin units
    },
    success: {
      main: '#2e7d32', // Green for districts
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 8
        }
      }
    }
  }
});

const AdminApp = () => (
  <ThemeProvider theme={adminTheme}>
    <AdminPanelHierarchyPage />
  </ThemeProvider>
);
```

### Arabic/RTL Support
```jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const rtlTheme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif'
  }
});

const ArabicAdminPanel = () => (
  <CacheProvider value={cacheRtl}>
    <ThemeProvider theme={rtlTheme}>
      <div dir="rtl">
        <AdminPanelHierarchyPage />
      </div>
    </ThemeProvider>
  </CacheProvider>
);
```

## State Management Integration

### Redux Integration
```jsx
// store/hierarchySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchHierarchyData = createAsyncThunk(
  'hierarchy/fetchData',
  async () => {
    const response = await fetch('/api/hierarchy-management/tree');
    return response.json();
  }
);

const hierarchySlice = createSlice({
  name: 'hierarchy',
  initialState: {
    data: [],
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHierarchyData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHierarchyData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchHierarchyData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

// Component usage
import { useSelector, useDispatch } from 'react-redux';

const HierarchyComponent = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector(state => state.hierarchy);

  useEffect(() => {
    dispatch(fetchHierarchyData());
  }, [dispatch]);

  // Component logic
};
```

### Context API Integration
```jsx
// contexts/HierarchyContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';

const HierarchyContext = createContext();

export const useHierarchy = () => {
  const context = useContext(HierarchyContext);
  if (!context) {
    throw new Error('useHierarchy must be used within HierarchyProvider');
  }
  return context;
};

export const HierarchyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(hierarchyReducer, initialState);

  const actions = {
    fetchData: () => {
      // Fetch hierarchy data
    },
    addItem: (level, item) => {
      // Add new hierarchy item
    },
    updateItem: (level, id, updates) => {
      // Update hierarchy item
    },
    deleteItem: (level, id) => {
      // Delete hierarchy item
    }
  };

  return (
    <HierarchyContext.Provider value={{ state, actions }}>
      {children}
    </HierarchyContext.Provider>
  );
};
```

## Error Handling and Validation

### Global Error Boundary
```jsx
import React from 'react';
import { Alert, Box, Button } from '@mui/material';

class HierarchyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Hierarchy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={3}>
          <Alert 
            severity="error" 
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
            }
          >
            Something went wrong with the hierarchy management system.
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Usage
const AdminPanel = () => (
  <HierarchyErrorBoundary>
    <AdminPanelHierarchyPage />
  </HierarchyErrorBoundary>
);
```

## Testing Integration

### Component Testing
```jsx
// __tests__/AdminPanelHierarchyPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPanelHierarchyPage from '../AdminPanelHierarchyPage';

// Mock the API
jest.mock('../api/hierarchy', () => ({
  fetchHierarchyTree: jest.fn(() => Promise.resolve(mockHierarchyData)),
  createRegion: jest.fn(() => Promise.resolve(mockRegion))
}));

describe('AdminPanelHierarchyPage', () => {
  it('renders hierarchy management tabs', () => {
    render(
      <BrowserRouter>
        <AdminPanelHierarchyPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Manage Values')).toBeInTheDocument();
    expect(screen.getByText('Quick Add')).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    render(
      <BrowserRouter>
        <AdminPanelHierarchyPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Manage Values'));
    expect(screen.getByText('Select Hierarchy Level')).toBeInTheDocument();
  });
});
```

### E2E Testing
```javascript
// cypress/integration/hierarchy-management.spec.js
describe('Hierarchy Management', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password');
    cy.visit('/admin/hierarchy');
  });

  it('should allow creating a complete hierarchy path', () => {
    // Switch to Quick Add tab
    cy.get('[data-testid="quick-add-tab"]').click();

    // Create region
    cy.get('[data-testid="region-name-input"]').type('Test Region');
    cy.get('[data-testid="next-button"]').click();

    // Create locality
    cy.get('[data-testid="locality-name-input"]').type('Test Locality');
    cy.get('[data-testid="next-button"]').click();

    // Create admin unit
    cy.get('[data-testid="admin-unit-name-input"]').type('Test Admin Unit');
    cy.get('[data-testid="next-button"]').click();

    // Create district
    cy.get('[data-testid="district-name-input"]').type('Test District');
    cy.get('[data-testid="complete-button"]').click();

    // Verify success
    cy.get('[data-testid="success-alert"]').should('contain', 'Complete hierarchy path created');
  });
});
```

## Deployment Considerations

### Environment-Specific Configuration
```jsx
// config/hierarchy.js
const hierarchyConfig = {
  development: {
    apiBaseUrl: 'http://localhost:5000/api',
    enableDebugMode: true,
    showTestData: true
  },
  production: {
    apiBaseUrl: '/api',
    enableDebugMode: false,
    showTestData: false
  }
};

export default hierarchyConfig[process.env.NODE_ENV || 'development'];
```

### Performance Optimization
```jsx
import React, { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy load components
const AdminHierarchyPage = lazy(() => import('./AdminHierarchyPage'));
const HierarchyValuesManager = lazy(() => import('./HierarchyValuesManager'));
const QuickAddHierarchy = lazy(() => import('./QuickAddHierarchy'));

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" p={3}>
    <CircularProgress />
  </Box>
);

const AdminPanelHierarchyPage = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {/* Component content */}
    </Suspense>
  );
};
```

This integration guide provides comprehensive instructions for adding the hierarchy management functionality to your admin panel with proper error handling, permissions, and testing strategies.
