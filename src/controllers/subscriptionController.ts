import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import HierarchyService from '../services/hierarchyService';
import { AuthenticatedRequest } from '../types';
import { Subscription } from '@prisma/client';

/**
 * Calculate subscription end date based on period
 */
const calculateEndDate = (startDate: Date | string, period: string): Date => {
  const start = new Date(startDate);
  const end = new Date(start);
  
  switch (period) {
    case 'monthly':
      end.setMonth(end.getMonth() + 1);
      break;
    case 'quarterly':
      end.setMonth(end.getMonth() + 3);
      break;
    case 'biannual':
      end.setMonth(end.getMonth() + 6);
      break;
    case 'annual':
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 'one-time':
      // For one-time subscriptions, set end date to 1 year from start
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      // Default to monthly
      end.setMonth(end.getMonth() + 1);
  }
  
  return end;
};

/**
 * Check and update expired subscriptions
 */
const checkExpiredSubscriptionsHelper = async (): Promise<number> => {
  const now = new Date();
  
  // Find expired subscriptions
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      endDate: {
        lt: now
      },
      status: 'active'
    }
  });
  
  // Update expired subscriptions
  if (expiredSubscriptions.length > 0) {
    await prisma.subscription.updateMany({
      where: {
        id: {
          in: expiredSubscriptions.map(sub => sub.id)
        }
      },
      data: {
        status: 'expired'
      }
    });
    
    console.log(`Updated ${expiredSubscriptions.length} expired subscriptions`);
  }
  
  return expiredSubscriptions.length;
};

/**
 * Renew a subscription based on its plan period
 */
const renewSubscriptionHelper = async (subscriptionId: string): Promise<any> => {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true }
  });
  
  if (!subscription) {
    throw new Error('Subscription not found');
  }
  
  if (subscription.status !== 'active') {
    throw new Error('Only active subscriptions can be renewed');
  }
  
  // Calculate new end date based on plan period
  const newEndDate = calculateEndDate(subscription.endDate, subscription.plan.period);
  
  // Update subscription with new end date
  const renewedSubscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      endDate: newEndDate,
      paymentStatus: 'pending', // Reset payment status for renewal
      paymentDate: null,
      receipt: null
    }
  });
  
  return renewedSubscription;
};

/**
 * Get subscription plans with hierarchical filtering
 */
export const getSubscriptionPlans = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { isApproved, isDonation, hierarchyLevel, hierarchyId } = req.query;
    const currentUser = req.user;
    
    // Base filter
    const filter: any = {
      where: {
        active: true
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        },
        subscriptions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    };
    
    // Add isDonation filter
    if (isDonation !== undefined) {
      filter.where.isDonation = isDonation === 'true';
    }
    
    // Add hierarchical filtering
    if (hierarchyLevel && hierarchyId) {
      switch (hierarchyLevel) {
        case 'region':
          filter.where.targetRegionId = hierarchyId;
          break;
        case 'locality':
          filter.where.targetLocalityId = hierarchyId;
          break;
        case 'adminUnit':
          filter.where.targetAdminUnitId = hierarchyId;
          break;
        case 'district':
          filter.where.targetDistrictId = hierarchyId;
          break;
      }
    } else {
      // Filter based on user's hierarchical position
      if (currentUser) {
        // Root admins (ADMIN) can see all plans
        if (currentUser.adminLevel === 'ADMIN') {
          // No additional filtering for root admins - they can see everything
        } else {
          // Use hierarchy service to build proper filter
          const hierarchyFilter = HierarchyService.buildContentFilter(currentUser);
          
          if (hierarchyFilter.OR && hierarchyFilter.OR.length > 0) {
            filter.where.OR = hierarchyFilter.OR;
          }
        }
      }
    }
    
    // Add isApproved filter
    if (isApproved !== undefined) {
      filter.where.isApproved = isApproved === 'true';
    } else {
      // If isApproved is not specified, show approved plans + user's own unapproved plans
      if (currentUser && currentUser.adminLevel !== 'ADMIN') {
        // If we already have OR conditions from hierarchical filtering, we need to combine them
        if (filter.where.OR) {
          // Combine hierarchical OR with approval OR
          const hierarchicalConditions = filter.where.OR;
          delete filter.where.OR;
          
          filter.where.AND = [
            {
              OR: hierarchicalConditions
            },
            {
              OR: [
                { isApproved: true },
                { 
                  AND: [
                    { isApproved: false },
                    { creatorId: currentUser.id }
                  ]
                }
              ]
            }
          ];
        } else {
          // No existing OR conditions, safe to add approval OR
          filter.where.OR = [
            { isApproved: true },
            { 
              AND: [
                { isApproved: false },
                { creatorId: currentUser.id }
              ]
            }
          ];
        }
      }
    }
    
    const plans = await prisma.subscriptionPlan.findMany(filter);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message 
    });
  }
};

/**
 * Get subscription plan by ID
 */
export const getSubscriptionPlanById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        },
        subscriptions: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                mobileNumber: true,
                profile: true,
                adminLevel: true
              }
            }
          }
        }
      }
    });
    
    if (!plan) {
      res.status(404).json({ 
        success: false,
        message: 'Subscription plan not found' 
      });
      return;
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error: any) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch subscription plan',
      error: error.message 
    });
  }
};

/**
 * Create a new subscription plan
 */
export const createSubscriptionPlan = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  console.log('=== CREATE SUBSCRIPTION PLAN CALLED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  try {
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.log('Creating subscription plan for user:', currentUser.id);
    console.log('Request body:', req.body);
    
    const {
      title, 
      description, 
      price, 
      currency,
      period, 
      isDonation,
      targetRegionId,
      targetLocalityId,
      targetAdminUnitId,
      targetDistrictId
    } = req.body;
    
    // Validate required fields
    if (!title || !currency || !period) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }
    
    // For non-donation plans, price is required
    if (!isDonation && !price) {
      res.status(400).json({
        success: false,
        message: 'Price is required for subscription plans'
      });
      return;
    }

    // Validate hierarchical targeting
    if (!targetRegionId && !targetLocalityId && !targetAdminUnitId && !targetDistrictId) {
      res.status(400).json({
        success: false,
        message: 'At least one hierarchy level target must be specified'
      });
      return;
    }
    
    // Validate that referenced hierarchy entities exist (only if not empty)
    if (targetRegionId && typeof targetRegionId === 'string' && targetRegionId.trim()) {
      const region = await prisma.region.findUnique({ where: { id: targetRegionId } });
      if (!region) {
        res.status(400).json({
          success: false,
          message: 'Invalid region ID'
        });
        return;
      }
    }
    
    if (targetLocalityId && typeof targetLocalityId === 'string' && targetLocalityId.trim()) {
      const locality = await prisma.locality.findUnique({ where: { id: targetLocalityId } });
      if (!locality) {
        res.status(400).json({
          success: false,
          message: 'Invalid locality ID'
        });
        return;
      }
    }
    
    if (targetAdminUnitId && typeof targetAdminUnitId === 'string' && targetAdminUnitId.trim()) {
      const adminUnit = await prisma.adminUnit.findUnique({ where: { id: targetAdminUnitId } });
      if (!adminUnit) {
        res.status(400).json({
          success: false,
          message: 'Invalid admin unit ID'
        });
        return;
      }
    }
    
    if (targetDistrictId && typeof targetDistrictId === 'string' && targetDistrictId.trim()) {
      const district = await prisma.district.findUnique({ where: { id: targetDistrictId } });
      if (!district) {
        res.status(400).json({
          success: false,
          message: 'Invalid district ID'
        });
        return;
      }
    }
    
    // Create the subscription plan
    const plan = await prisma.subscriptionPlan.create({
      data: {
        title,
        description,
        price: isDonation ? '0' : price, // Set price to 0 for donations
        currency,
        period,
        features: '[]', // Features field removed
        isDonation: isDonation || false,
        creatorId: currentUser.id,
        
        // Only automatically approve if user is ADMIN
        isApproved: currentUser.adminLevel === 'ADMIN',
        approverId: currentUser.adminLevel === 'ADMIN' ? currentUser.id : null,
        
        // Hierarchical targeting - convert empty strings to null
        targetRegionId: targetRegionId || null,
        targetLocalityId: targetLocalityId || null,
        targetAdminUnitId: targetAdminUnitId || null,
        targetDistrictId: targetDistrictId || null
      }
    });
    
    // If plan is automatically approved (ADMIN user), create automatic subscriptions
    let subscriptionsCreated = 0;
    if (currentUser.adminLevel === 'ADMIN') {
      try {
        const targetUsers = await HierarchyService.getUsersForSubscriptionPlan(plan);
        
        console.log(`Creating automatic subscriptions for ${targetUsers.length} users`);
        
        for (const user of targetUsers) {
          // Calculate subscription dates
          const startDate = new Date();
          const endDate = new Date();
          
          // Set end date based on plan period
          switch (plan.period) {
            case 'monthly':
              endDate.setMonth(endDate.getMonth() + 1);
              break;
            case 'quarterly':
              endDate.setMonth(endDate.getMonth() + 3);
              break;
            case 'biannual':
              endDate.setMonth(endDate.getMonth() + 6);
              break;
            case 'annual':
              endDate.setFullYear(endDate.getFullYear() + 1);
              break;
            case 'one-time':
              endDate.setFullYear(endDate.getFullYear() + 10);
              break;
            default:
              endDate.setFullYear(endDate.getFullYear() + 1);
          }
          
          // Create subscription
          await prisma.subscription.create({
            data: {
              planId: plan.id,
              userId: user.id,
              startDate,
              endDate,
              amount: plan.price,
              paymentStatus: 'pending',
              status: 'active'
            }
          });
          
          subscriptionsCreated++;
        }
        
        console.log(`Successfully created ${subscriptionsCreated} automatic subscriptions`);
      } catch (autoSubscribeError: any) {
        console.error('Error creating automatic subscriptions:', autoSubscribeError);
        // Continue with plan creation even if auto-subscription fails
      }
    }

    res.status(201).json({
      success: true,
      data: plan,
      message: currentUser.adminLevel === 'ADMIN' ? 
        `Subscription plan created, approved, and ${subscriptionsCreated} automatic subscriptions created` : 
        'Subscription plan created and awaiting approval',
      subscriptionsCreated: subscriptionsCreated
    });
  } catch (error: any) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create subscription plan',
      error: error.message 
    });
  }
};

/**
 * Approve a subscription plan (GENERAL_SECRETARIAT only)
 */
export const approveSubscriptionPlan = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    
    // Only ADMIN users can approve plans
    if (currentUser.adminLevel !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only general secretariat users can approve subscription plans'
      });
      return;
    }
    
    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
      return;
    }
    
    // Update the plan to approved status
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        isApproved: true,
        approverId: currentUser.id
      }
    });

    // Automatically create subscriptions for all users in the target hierarchy
    try {
      const targetUsers = await HierarchyService.getUsersForSubscriptionPlan(plan);
      
      console.log(`Creating automatic subscriptions for ${targetUsers.length} users`);
      
      const subscriptions: Subscription[] = [];
      for (const user of targetUsers) {
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        
        // Set end date based on plan period
        switch (plan.period) {
          case 'monthly':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
          case 'quarterly':
            endDate.setMonth(endDate.getMonth() + 3);
            break;
          case 'biannual':
            endDate.setMonth(endDate.getMonth() + 6);
            break;
          case 'annual':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
          case 'one-time':
            endDate.setFullYear(endDate.getFullYear() + 10); // Long-term for one-time
            break;
          default:
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        // Create subscription
        const subscription = await prisma.subscription.create({
          data: {
            planId: plan.id,
            userId: user.id,
            startDate,
            endDate,
            amount: plan.price,
            paymentStatus: 'pending', // Users need to pay
            status: 'active'
          }
        });
        
        subscriptions.push(subscription);
      }
      
      console.log(`Successfully created ${subscriptions.length} automatic subscriptions`);
      
      res.json({
        success: true,
        data: updatedPlan,
        message: `Subscription plan approved and ${subscriptions.length} automatic subscriptions created`,
        subscriptionsCreated: subscriptions.length
      });
      
    } catch (autoSubscribeError: any) {
      console.error('Error creating automatic subscriptions:', autoSubscribeError);
      // Still return success for plan approval, but log the error
      res.json({
        success: true,
        data: updatedPlan,
        message: 'Subscription plan approved, but some automatic subscriptions may have failed',
        warning: 'Some users may not have been automatically subscribed'
      });
    }
  } catch (error: any) {
    console.error('Error approving subscription plan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to approve subscription plan',
      error: error.message 
    });
  }
};

/**
 * Update a subscription plan
 */
export const updateSubscriptionPlan = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    const {
      title, 
      description, 
      price, 
      currency,
      period, 
      isDonation,
      active,
      targetRegionId,
      targetLocalityId,
      targetAdminUnitId,
      targetDistrictId
    } = req.body;
    
    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
      return;
    }
    
    // Only the creator or an ADMIN user can update
    if (plan.creatorId !== currentUser.id && currentUser.adminLevel !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to update this subscription plan'
      });
      return;
    }
    
    // Update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (currency !== undefined) updateData.currency = currency;
    if (period !== undefined) updateData.period = period;
    // Features field removed
    if (isDonation !== undefined) updateData.isDonation = isDonation;
    if (active !== undefined) updateData.active = active;
    if (targetRegionId !== undefined) updateData.targetRegionId = targetRegionId;
    if (targetLocalityId !== undefined) updateData.targetLocalityId = targetLocalityId;
    if (targetAdminUnitId !== undefined) updateData.targetAdminUnitId = targetAdminUnitId;
    if (targetDistrictId !== undefined) updateData.targetDistrictId = targetDistrictId;
    
    // If non-ADMIN user makes changes, reset approval
    if (currentUser.adminLevel !== 'ADMIN') {
      updateData.isApproved = false;
      updateData.approverId = null;
    }
    
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      data: updatedPlan,
      message: 'Subscription plan updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update subscription plan',
      error: error.message 
    });
  }
};

/**
 * Delete a subscription plan
 */
export const deleteSubscriptionPlan = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    
    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: true
      }
    });
    
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
      return;
    }
    
    // Only the creator or ADMIN can delete
    if (plan.creatorId !== currentUser.id && currentUser.adminLevel !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this subscription plan'
      });
      return;
    }
    
    // Check if the plan has active subscriptions
    if (plan.subscriptions.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete a plan with active subscriptions'
      });
      return;
    }
    
    // Delete the plan
    await prisma.subscriptionPlan.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete subscription plan',
      error: error.message 
    });
  }
};

/**
 * Get subscriptions with filtering options
 */
export const getSubscriptions = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { planId, userId, status, paymentStatus } = req.query;
    const currentUser = req.user;
    
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Base filter
    const filter: any = {
      where: {},
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    };
    
    // Add filters if provided
    if (planId) filter.where.planId = planId;
    if (userId) filter.where.userId = userId;
    if (status) filter.where.status = status;
    if (paymentStatus) filter.where.paymentStatus = paymentStatus;
    
    // Add hierarchical filtering based on user's position
    if (currentUser.adminLevel !== 'ADMIN') {
      // Get plans this admin is responsible for
      const adminSubscriptionPlans = await prisma.subscriptionPlan.findMany({
        where: {
          OR: [
            { creatorId: currentUser.id },
            ...(currentUser.regionId ? [{ targetRegionId: currentUser.regionId }] : []),
            ...(currentUser.localityId ? [{ targetLocalityId: currentUser.localityId }] : []),
            ...(currentUser.adminUnitId ? [{ targetAdminUnitId: currentUser.adminUnitId }] : []),
            ...(currentUser.districtId ? [{ targetDistrictId: currentUser.districtId }] : [])
          ]
        },
        select: { id: true }
      });
      
      const planIds = adminSubscriptionPlans.map(p => p.id);
      
      if (planIds.length > 0) {
        // If a specific planId was requested, check if the admin has access to it
        if (planId) {
          if (!planIds.includes(planId as string)) {
            // Admin doesn't have access to this specific plan
            res.json({
              success: true,
              data: []
            });
            return;
          }
          // Admin has access to the specific plan, keep the original filter
        } else {
          // No specific planId requested, filter by all accessible plans
          filter.where.planId = { in: planIds };
        }
      } else {
        // If no plans found, return empty result
        res.json({
          success: true,
          data: []
        });
        return;
      }
    }
    
    const subscriptions = await prisma.subscription.findMany(filter);
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message 
    });
  }
};

/**
 * Get subscription by ID
 */
export const getSubscriptionById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        }
      }
    });
    
    if (!subscription) {
      res.status(404).json({ 
        success: false,
        message: 'Subscription not found' 
      });
      return;
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message 
    });
  }
};

/**
 * Create a new subscription for a user
 */
export const createSubscription = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const {
      planId,
      userId,
      startDate,
      endDate,
      amount,
      paymentMethod,
      receipt
    } = req.body;
    
    // Validate required fields
    if (!planId || !userId || !startDate || !amount) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });
    
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
      return;
    }
    
    // Check if plan is approved
    if (!plan.isApproved) {
      res.status(400).json({
        success: false,
        message: 'Cannot subscribe to an unapproved plan'
      });
      return;
    }
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    // Check for existing active subscription to the same plan
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        planId: planId,
        status: 'active'
      }
    });
    
    if (existingSubscription) {
      res.status(400).json({
        success: false,
        message: 'User already has an active subscription to this plan'
      });
      return;
    }
    
    // Calculate end date based on plan period if not provided
    const calculatedEndDate = endDate ? new Date(endDate) : calculateEndDate(startDate, plan.period);
    
    // Create the subscription
    const subscription = await prisma.subscription.create({
      data: {
        planId,
        userId,
        startDate: new Date(startDate),
        endDate: calculatedEndDate,
        amount,
        receipt,
        paymentMethod,
        paymentStatus: receipt ? 'paid' : 'pending',
        paymentDate: receipt ? new Date() : null,
        status: 'active'
      }
    });
    
    res.status(201).json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create subscription',
      error: error.message 
    });
  }
};

/**
 * Update a subscription (payment status, etc.)
 */
export const updateSubscription = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      paymentStatus,
      receipt,
      paymentMethod,
      amount,
      status
    } = req.body;
    
    // Find the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
      return;
    }
    
    // Update data
    const updateData: any = {};
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (receipt !== undefined) updateData.receipt = receipt;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (amount !== undefined) updateData.amount = amount;
    if (status !== undefined) updateData.status = status;
    
    // Set payment date if status changes to paid
    if (paymentStatus === 'paid' && subscription.paymentStatus !== 'paid') {
      updateData.paymentDate = new Date();
    }
    
    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update subscription',
      error: error.message 
    });
  }
};

/**
 * Delete a subscription
 */
export const deleteSubscription = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { id } = req.params;
    
    // Only GENERAL_SECRETARIAT users can delete subscriptions
    if (currentUser.adminLevel !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only general secretariat users can delete subscriptions'
      });
      return;
    }
    
    // Find the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
      return;
    }
    
    // Delete the subscription
    await prisma.subscription.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete subscription',
      error: error.message 
    });
  }
};

/**
 * Get subscription payment statistics
 */
export const getSubscriptionStats = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { planId } = req.query;
    
    // Base filter for the plan
    const planFilter: any = planId ? { planId } : {};
    
    // Get total counts
    const totalSubscriptions = await prisma.subscription.count({
      where: planFilter
    });
    
    const paidSubscriptions = await prisma.subscription.count({
      where: {
        ...planFilter,
        paymentStatus: 'paid'
      }
    });
    
    const pendingSubscriptions = await prisma.subscription.count({
      where: {
        ...planFilter,
        paymentStatus: 'pending'
      }
    });
    
    // Calculate total amount paid
    const paidSubscriptionsList = await prisma.subscription.findMany({
      where: {
        ...planFilter,
        paymentStatus: 'paid'
      },
      select: {
        amount: true
      }
    });
    
    const totalPaid = paidSubscriptionsList.reduce((sum, sub) => {
      return sum + parseFloat(sub.amount);
    }, 0);
    
    res.json({
      success: true,
      data: {
        totalSubscriptions,
        paidSubscriptions,
        pendingSubscriptions,
        paymentRate: totalSubscriptions > 0 ? (paidSubscriptions / totalSubscriptions) * 100 : 0,
        totalPaid
      }
    });
  } catch (error: any) {
    console.error('Error getting subscription stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get subscription statistics',
      error: error.message 
    });
  }
};

/**
 * Renew a subscription
 */
export const renewSubscription = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const renewedSubscription = await renewSubscriptionHelper(id);
    
    res.json({
      success: true,
      data: renewedSubscription,
      message: 'Subscription renewed successfully'
    });
  } catch (error: any) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to renew subscription',
      error: error.message 
    });
  }
};

/**
 * Check and update expired subscriptions
 */
export const checkExpiredSubscriptions = async (_req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const expiredCount = await checkExpiredSubscriptionsHelper();
    
    res.json({
      success: true,
      data: { expiredCount },
      message: `Checked and updated ${expiredCount} expired subscriptions`
    });
  } catch (error: any) {
    console.error('Error checking expired subscriptions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to check expired subscriptions',
      error: error.message 
    });
  }
};

/**
 * Upload payment receipt for a subscription
 */
export const uploadReceipt = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    if (!currentUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if subscription exists and belongs to the user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: id,
        userId: currentUser.id
      }
    });
    
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
      return;
    }
    
    // Check if file was uploaded
    if (!(req as any).file) {
      res.status(400).json({
        success: false,
        message: 'Receipt file is required'
      });
      return;
    }
    
    // Convert file buffer to base64 for storage
    // In production, you'd save this to a file system or cloud storage
    const receiptData = `data:${(req as any).file.mimetype};base64,${(req as any).file.buffer.toString('base64')}`;
    
    // Update subscription with receipt
    const updatedSubscription = await prisma.subscription.update({
      where: { id: id },
      data: {
        receipt: receiptData,
        paymentStatus: 'pending_review'
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      data: updatedSubscription,
      message: 'Receipt uploaded successfully'
    });
  } catch (error: any) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload receipt',
      error: error.message 
    });
  }
};

