# TypeScript Conversion Guide

## Status
- ✅ TypeScript configuration (tsconfig.json)
- ✅ Package.json updated with TypeScript dependencies
- ✅ Core utilities converted (prisma.ts, auth.ts)
- ✅ Types file created (types/index.ts)
- ✅ Seed script converted (prisma/seed.ts)
- ⏳ Remaining files need conversion

## Conversion Pattern

### For Controllers:
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

export const getSomething = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Implementation
  } catch (error: any) {
    // Error handling
  }
};
```

### For Routes:
```typescript
import express, { Router } from 'express';
import * as controller from '../controllers/controllerName';
import { authenticate } from '../middlewares/auth';

const router: Router = express.Router();
router.use(authenticate);
router.get('/path', controller.getSomething);
export default router;
```

### For Services:
```typescript
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export class ServiceName {
  static async methodName(params: any): Promise<ReturnType> {
    // Implementation
  }
}
```

## Files to Convert

### Controllers (14 files):
- adminController.js
- adminHierarchyController.js
- authController.js
- bulletinController.js
- chatController.js
- contentController.js
- expatriateHierarchyController.js
- hierarchicalUserController.js
- hierarchyController.js
- hierarchyManagementController.js
- sectorHierarchyController.js
- settingsController.js
- subscriptionController.js
- userController.js

### Routes (14 files):
- adminHierarchyRoutes.js
- adminRoutes.js
- authRoutes.js
- chatRoutes.js
- contentRoutes.js
- expatriateHierarchyRoutes.js
- hierarchicalUserRoutes.js
- hierarchyManagementRoutes.js
- hierarchyRoutes.js
- publicRoutes.js
- sectorHierarchyRoutes.js
- settingsRoutes.js
- subscriptionRoutes.js
- userRoutes.js

### Services (9 files):
- authService.js
- contentService.js
- expatriateHierarchyService.js
- hierarchicalUserService.js
- hierarchyService.js
- multiHierarchyFilterService.js
- sectorHierarchyService.js
- settingsService.js
- userService.js

### Middlewares (3 files):
- auth.js (partially done - needs full conversion)
- errorHandler.js
- hierarchicalAccess.js

### Utils (1 file):
- mobileNormalization.js

### Main:
- app.js

## Quick Conversion Script

You can use this pattern to convert files:

1. Change file extension from `.js` to `.ts`
2. Replace `require()` with `import`
3. Replace `module.exports` with `export`
4. Add type annotations
5. Import types from `../types`

## Running After Conversion

```bash
npm install  # Install TypeScript dependencies
npm run build  # Compile TypeScript
npm run dev  # Run in development mode
npm start  # Run production build
```

