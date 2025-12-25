import express, { Router } from 'express';
import * as expatriateHierarchyController from '../controllers/expatriateHierarchyController';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();

// Admin levels that can manage expatriate hierarchy
const adminOnly = authorize(['ADMIN', 'GENERAL_SECRETARIAT']);
const expatriateAdmins = authorize([
  'ADMIN', 
  'GENERAL_SECRETARIAT', 
  'EXPATRIATE_GENERAL', 
  'EXPATRIATE_NATIONAL_LEVEL',
  'EXPATRIATE_REGION',
  'EXPATRIATE_LOCALITY',
  'EXPATRIATE_ADMIN_UNIT',
  'EXPATRIATE_DISTRICT'
]);

// All routes require authentication
router.use(authenticate);

// ==================== EXPATRIATE NATIONAL LEVEL ROUTES ====================
router.get('/expatriate-national-levels', expatriateHierarchyController.getAllExpatriateNationalLevels);
router.get('/expatriate-national-levels/:id', expatriateHierarchyController.getExpatriateNationalLevelById);
router.post('/expatriate-national-levels', adminOnly, expatriateHierarchyController.createExpatriateNationalLevel);
router.put('/expatriate-national-levels/:id', adminOnly, expatriateHierarchyController.updateExpatriateNationalLevel);
router.delete('/expatriate-national-levels/:id', adminOnly, expatriateHierarchyController.deleteExpatriateNationalLevel);

// Get regions by national level
router.get('/expatriate-national-levels/:nationalLevelId/regions', expatriateHierarchyController.getExpatriateRegionsByNationalLevel);

// ==================== EXPATRIATE REGION ROUTES ====================
router.get('/expatriate-regions', expatriateHierarchyController.getAllExpatriateRegions);
router.get('/expatriate-regions/:id', expatriateHierarchyController.getExpatriateRegionById);
router.post('/expatriate-regions', adminOnly, expatriateHierarchyController.createExpatriateRegion);
router.put('/expatriate-regions/:id', expatriateAdmins, expatriateHierarchyController.updateExpatriateRegion);
router.delete('/expatriate-regions/:id', adminOnly, expatriateHierarchyController.deleteExpatriateRegion);

// User management for regions
router.get('/expatriate-regions/:id/users', expatriateAdmins, expatriateHierarchyController.getUsersByExpatriateRegion);
router.post('/expatriate-regions/:id/users', expatriateAdmins, expatriateHierarchyController.createUserForExpatriateRegion);
router.put('/users/:userId/expatriate-region', expatriateAdmins, expatriateHierarchyController.assignUserToExpatriateRegion);

// Get localities by region
router.get('/expatriate-regions/:regionId/localities', expatriateHierarchyController.getExpatriateLocalitiesByRegion);

// ==================== EXPATRIATE LOCALITY ROUTES ====================
router.get('/expatriate-localities/:id', expatriateHierarchyController.getExpatriateLocalityById);
router.post('/expatriate-localities', expatriateAdmins, expatriateHierarchyController.createExpatriateLocality);
router.put('/expatriate-localities/:id', expatriateAdmins, expatriateHierarchyController.updateExpatriateLocality);
router.delete('/expatriate-localities/:id', expatriateAdmins, expatriateHierarchyController.deleteExpatriateLocality);

// User management for localities
router.get('/expatriate-localities/:id/users', expatriateAdmins, expatriateHierarchyController.getUsersByExpatriateLocality);

// Get admin units by locality
router.get('/expatriate-localities/:localityId/admin-units', expatriateHierarchyController.getExpatriateAdminUnitsByLocality);

// ==================== EXPATRIATE ADMIN UNIT ROUTES ====================
router.get('/expatriate-admin-units/:id', expatriateHierarchyController.getExpatriateAdminUnitById);
router.post('/expatriate-admin-units', expatriateAdmins, expatriateHierarchyController.createExpatriateAdminUnit);
router.put('/expatriate-admin-units/:id', expatriateAdmins, expatriateHierarchyController.updateExpatriateAdminUnit);
router.delete('/expatriate-admin-units/:id', expatriateAdmins, expatriateHierarchyController.deleteExpatriateAdminUnit);

// User management for admin units
router.get('/expatriate-admin-units/:id/users', expatriateAdmins, expatriateHierarchyController.getUsersByExpatriateAdminUnit);

// Get districts by admin unit
router.get('/expatriate-admin-units/:adminUnitId/districts', expatriateHierarchyController.getExpatriateDistrictsByAdminUnit);

// ==================== EXPATRIATE DISTRICT ROUTES ====================
router.get('/expatriate-districts/:id', expatriateHierarchyController.getExpatriateDistrictById);
router.post('/expatriate-districts', expatriateAdmins, expatriateHierarchyController.createExpatriateDistrict);
router.put('/expatriate-districts/:id', expatriateAdmins, expatriateHierarchyController.updateExpatriateDistrict);
router.delete('/expatriate-districts/:id', expatriateAdmins, expatriateHierarchyController.deleteExpatriateDistrict);

// User management for districts
router.get('/expatriate-districts/:id/users', expatriateAdmins, expatriateHierarchyController.getUsersByExpatriateDistrict);
router.post('/expatriate-districts/:id/users', expatriateAdmins, expatriateHierarchyController.createUserForExpatriateDistrict);

export default router;
