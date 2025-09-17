const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate subscription end date based on period
 */
const calculateEndDate = (startDate, period) => {
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
const checkExpiredSubscriptions = async () => {
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
const renewSubscription = async (subscriptionId) => {
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
exports.getSubscriptionPlans = async (req, res) => {
  try {
    const { isApproved, isDonation, hierarchyLevel, hierarchyId } = req.query;
    const currentUser = req.user;
    
    // Base filter
    const filter = {
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
          const HierarchyService = require('../services/hierarchyService');
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
  } catch (error) {
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
exports.getSubscriptionPlanById = async (req, res) => {
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
      return res.status(404).json({ 
        success: false,
        message: 'Subscription plan not found' 
      });
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
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
exports.createSubscriptionPlan = async (req, res) => {
  console.log('=== CREATE SUBSCRIPTION PLAN CALLED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  try {
    const currentUser = req.user;
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // For non-donation plans, price is required
    if (!isDonation && !price) {
      return res.status(400).json({
        success: false,
        message: 'Price is required for subscription plans'
      });
    }

    // Validate hierarchical targeting
    if (!targetRegionId && !targetLocalityId && !targetAdminUnitId && !targetDistrictId) {
      return res.status(400).json({
        success: false,
        message: 'At least one hierarchy level target must be specified'
      });
    }
    
    // Validate that referenced hierarchy entities exist (only if not empty)
    if (targetRegionId && targetRegionId.trim()) {
      const region = await prisma.region.findUnique({ where: { id: targetRegionId } });
      if (!region) {
        return res.status(400).json({
          success: false,
          message: 'Invalid region ID'
        });
      }
    }
    
    if (targetLocalityId && targetLocalityId.trim()) {
      const locality = await prisma.locality.findUnique({ where: { id: targetLocalityId } });
      if (!locality) {
        return res.status(400).json({
          success: false,
          message: 'Invalid locality ID'
        });
      }
    }
    
    if (targetAdminUnitId && targetAdminUnitId.trim()) {
      const adminUnit = await prisma.adminUnit.findUnique({ where: { id: targetAdminUnitId } });
      if (!adminUnit) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin unit ID'
        });
      }
    }
    
    if (targetDistrictId && targetDistrictId.trim()) {
      const district = await prisma.district.findUnique({ where: { id: targetDistrictId } });
      if (!district) {
        return res.status(400).json({
          success: false,
          message: 'Invalid district ID'
        });
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
        const HierarchyService = require('../services/hierarchyService');
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
      } catch (autoSubscribeError) {
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
  } catch (error) {
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
exports.approveSubscriptionPlan = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    
    // Only ADMIN users can approve plans
    if (currentUser.adminLevel !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only general secretariat users can approve subscription plans'
      });
    }
    
    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id }
    });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
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
      const HierarchyService = require('../services/hierarchyService');
      const targetUsers = await HierarchyService.getUsersForSubscriptionPlan(plan);
      
      console.log(`Creating automatic subscriptions for ${targetUsers.length} users`);
      
      const subscriptions = [];
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
      
    } catch (autoSubscribeError) {
      console.error('Error creating automatic subscriptions:', autoSubscribeError);
      // Still return success for plan approval, but log the error
      res.json({
        success: true,
        data: updatedPlan,
        message: 'Subscription plan approved, but some automatic subscriptions may have failed',
        warning: 'Some users may not have been automatically subscribed'
      });
    }
  } catch (error) {
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
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    const {
      title, 
      description, 
      price, 
      currency,
      period, 
      features,
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
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }
    
    // Only the creator or an ADMIN user can update
    if (plan.creatorId !== currentUser.id && currentUser.adminLevel !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this subscription plan'
      });
    }
    
    // Update data
    const updateData = {};
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
  } catch (error) {
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
exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    
    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: true
      }
    });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }
    
    // Only the creator or ADMIN can delete
    if (plan.creatorId !== currentUser.id && currentUser.adminLevel !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this subscription plan'
      });
    }
    
    // Check if the plan has active subscriptions
    if (plan.subscriptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a plan with active subscriptions'
      });
    }
    
    // Delete the plan
    await prisma.subscriptionPlan.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error) {
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
exports.getSubscriptions = async (req, res) => {
  try {
    const { planId, userId, status, paymentStatus } = req.query;
    const currentUser = req.user;
    
    // Base filter
    const filter = {
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
          if (!planIds.includes(planId)) {
            // Admin doesn't have access to this specific plan
            return res.json({
              success: true,
              data: []
            });
          }
          // Admin has access to the specific plan, keep the original filter
        } else {
          // No specific planId requested, filter by all accessible plans
          filter.where.planId = { in: planIds };
        }
      } else {
        // If no plans found, return empty result
        return res.json({
          success: true,
          data: []
        });
      }
    }
    
    const subscriptions = await prisma.subscription.findMany(filter);
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
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
exports.getSubscriptionById = async (req, res) => {
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
      return res.status(404).json({ 
        success: false,
        message: 'Subscription not found' 
      });
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
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
exports.createSubscription = async (req, res) => {
  try {
    const currentUser = req.user;
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }
    
    // Check if plan is approved
    if (!plan.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot subscribe to an unapproved plan'
      });
    }
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription to this plan'
      });
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
  } catch (error) {
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
exports.updateSubscription = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Update data
    const updateData = {};
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
  } catch (error) {
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
exports.deleteSubscription = async (req, res) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    
    // Only GENERAL_SECRETARIAT users can delete subscriptions
    if (currentUser.adminLevel !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only general secretariat users can delete subscriptions'
      });
    }
    
    // Find the subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Delete the subscription
    await prisma.subscription.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
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
exports.getSubscriptionStats = async (req, res) => {
  try {
    const { planId } = req.query;
    
    // Base filter for the plan
    const planFilter = planId ? { planId } : {};
    
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
  } catch (error) {
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
exports.renewSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const renewedSubscription = await renewSubscription(id);
    
    res.json({
      success: true,
      data: renewedSubscription,
      message: 'Subscription renewed successfully'
    });
  } catch (error) {
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
exports.checkExpiredSubscriptions = async (req, res) => {
  try {
    const expiredCount = await checkExpiredSubscriptions();
    
    res.json({
      success: true,
      data: { expiredCount },
      message: `Checked and updated ${expiredCount} expired subscriptions`
    });
  } catch (error) {
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
exports.uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if subscription exists and belongs to the user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: id,
        userId: req.user.id
      }
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Receipt file is required'
      });
    }
    
    // Convert file buffer to base64 for storage
    // In production, you'd save this to a file system or cloud storage
    const receiptData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
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
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload receipt',
      error: error.message 
    });
  }
};
