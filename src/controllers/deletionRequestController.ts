import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types';

interface UserDisplayInfo {
  id: string;
  email: string | null;
  mobileNumber: string;
  adminLevel?: string | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  memberDetails?: {
    fullName?: string | null;
  } | null;
}

const getUserDisplayName = (user?: UserDisplayInfo | null): string => {
  if (!user) return 'غير معروف';

  const firstName = user.profile?.firstName?.trim();
  const lastName = user.profile?.lastName?.trim();
  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  if (user.memberDetails?.fullName?.trim()) {
    return user.memberDetails.fullName.trim();
  }

  if (user.email) {
    return user.email;
  }

  return user.mobileNumber;
};

// Get all deletion requests (root admin only)
export const getAllDeletionRequests = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    
    // Only GENERAL_SECRETARIAT can view deletion requests
    if (adminUser?.adminLevel !== 'GENERAL_SECRETARIAT' && adminUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized - Only General Secretariat can view deletion requests' });
      return;
    }

    const requests = await prisma.deletionRequest.findMany({
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            adminLevel: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            memberDetails: {
              select: {
                fullName: true
              }
            }
          }
        },
        actionBy: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            memberDetails: {
              select: {
                fullName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedRequests = requests.map(req => ({
      id: req.id,
      requestType: 'hierarchy',
      entityType: req.entityType,
      itemId: req.entityId,
      itemName: req.entityName,
      requestReason: req.reason,
      requestDate: req.createdAt.toISOString(),
      requestedBy: req.requestedBy ? {
        id: req.requestedBy.id,
        name: getUserDisplayName(req.requestedBy),
        level: req.requestedBy.adminLevel || 'USER'
      } : undefined,
      status: req.status.toLowerCase(),
      actionDate: req.actionDate?.toISOString(),
      actionBy: req.actionBy ? {
        id: req.actionBy.id,
        name: getUserDisplayName(req.actionBy)
      } : undefined
    }));

    res.json({ data: formattedRequests });
  } catch (error: any) {
    console.error('Error getting deletion requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a deletion request
export const createDeletionRequest = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { entityType, entityId, entityName, reason } = req.body;

    // Validate required fields
    if (!entityType || !entityId || !entityName) {
      res.status(400).json({ error: 'Entity type, ID, and name are required' });
      return;
    }

    // Validate entityType
    if (!['REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT'].includes(entityType)) {
      res.status(400).json({ error: 'Invalid entity type' });
      return;
    }

    // Create the deletion request
    const deletionRequest = await prisma.deletionRequest.create({
      data: {
        entityType,
        entityId,
        entityName,
        reason: reason || 'طلب حذف من المسؤول',
        status: 'PENDING',
        requestedById: adminUser.id
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            adminLevel: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            memberDetails: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Deletion request created successfully',
      data: {
        id: deletionRequest.id,
        requestType: 'hierarchy',
        entityType: deletionRequest.entityType,
        itemId: deletionRequest.entityId,
        itemName: deletionRequest.entityName,
        requestReason: deletionRequest.reason,
        requestDate: deletionRequest.createdAt.toISOString(),
        requestedBy: deletionRequest.requestedBy ? {
          id: deletionRequest.requestedBy.id,
          name: getUserDisplayName(deletionRequest.requestedBy),
          level: deletionRequest.requestedBy.adminLevel || 'USER'
        } : undefined,
        status: deletionRequest.status.toLowerCase()
      }
    });
  } catch (error: any) {
    console.error('Error creating deletion request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve a deletion request (root admin only)
export const approveDeletionRequest = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    const { id } = req.params;

    // Only GENERAL_SECRETARIAT can approve deletion requests
    if (adminUser?.adminLevel !== 'GENERAL_SECRETARIAT' && adminUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized - Only General Secretariat can approve deletion requests' });
      return;
    }

    // Find the deletion request
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id }
    });

    if (!deletionRequest) {
      res.status(404).json({ error: 'Deletion request not found' });
      return;
    }

    if (deletionRequest.status !== 'PENDING') {
      res.status(400).json({ error: 'Request has already been processed' });
      return;
    }

    // Perform the deletion based on entity type
    try {
      switch (deletionRequest.entityType) {
        case 'REGION':
          await prisma.region.delete({ where: { id: deletionRequest.entityId } });
          break;
        case 'LOCALITY':
          await prisma.locality.delete({ where: { id: deletionRequest.entityId } });
          break;
        case 'ADMIN_UNIT':
          await prisma.adminUnit.delete({ where: { id: deletionRequest.entityId } });
          break;
        case 'DISTRICT':
          await prisma.district.delete({ where: { id: deletionRequest.entityId } });
          break;
        default:
          res.status(400).json({ error: 'Invalid entity type' });
          return;
      }

      // Update the deletion request status
      const updatedRequest = await prisma.deletionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          actionDate: new Date(),
          actionById: adminUser!.id
        }
      });

      res.json({
        message: 'Deletion request approved and entity deleted successfully',
        data: updatedRequest
      });
    } catch (deleteError: any) {
      // If deletion fails (e.g., foreign key constraints), reject the request
      if (deleteError.code === 'P2003') {
        await prisma.deletionRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            actionDate: new Date(),
            actionById: adminUser!.id,
            reason: deletionRequest.reason + ' (فشل: يحتوي على بيانات مرتبطة)'
          }
        });
        res.status(400).json({ 
          error: 'Cannot delete entity with associated data. Request has been rejected.' 
        });
        return;
      }
      throw deleteError;
    }
  } catch (error: any) {
    console.error('Error approving deletion request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject a deletion request (root admin only)
export const rejectDeletionRequest = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    const { id } = req.params;

    // Only GENERAL_SECRETARIAT can reject deletion requests
    if (adminUser?.adminLevel !== 'GENERAL_SECRETARIAT' && adminUser?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized - Only General Secretariat can reject deletion requests' });
      return;
    }

    // Find the deletion request
    const deletionRequest = await prisma.deletionRequest.findUnique({
      where: { id }
    });

    if (!deletionRequest) {
      res.status(404).json({ error: 'Deletion request not found' });
      return;
    }

    if (deletionRequest.status !== 'PENDING') {
      res.status(400).json({ error: 'Request has already been processed' });
      return;
    }

    // Update the deletion request status
    const updatedRequest = await prisma.deletionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        actionDate: new Date(),
        actionById: adminUser!.id
      }
    });

    res.json({
      message: 'Deletion request rejected successfully',
      data: updatedRequest
    });
  } catch (error: any) {
    console.error('Error rejecting deletion request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

