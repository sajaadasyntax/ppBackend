-- Add unique constraint to prevent duplicate active subscriptions
-- This migration adds a unique constraint on (userId, planId) where status = 'active'

-- First, let's clean up any existing duplicates by keeping only the most recent one
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY userId, planId 
      ORDER BY createdAt DESC
    ) as rn
  FROM Subscription 
  WHERE status = 'active'
)
DELETE FROM Subscription 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint for active subscriptions
-- Note: This is a partial unique index that only applies to active subscriptions
CREATE UNIQUE INDEX unique_active_subscription_per_user_plan 
ON Subscription (userId, planId) 
WHERE status = 'active';
