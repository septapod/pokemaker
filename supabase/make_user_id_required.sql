-- Make user_id NOT NULL to ensure all pokemon are owned by a user
-- This prevents orphaned pokemon without an owner

-- First, verify that all pokemon have a user_id
-- Run this query first to check if there are any NULL user_ids:
-- SELECT COUNT(*) FROM pokemon WHERE user_id IS NULL;
-- If the count is 0, it's safe to proceed

-- Make user_id required (NOT NULL)
ALTER TABLE pokemon
ALTER COLUMN user_id SET NOT NULL;

-- Verify the change
-- \d pokemon
