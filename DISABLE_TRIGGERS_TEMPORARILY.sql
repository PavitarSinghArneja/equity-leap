-- Temporarily disable the triggers on investments table to test if they're causing the issue
-- This will help us isolate whether the problem is in instant_buy_shares or in the triggers

ALTER TABLE investments DISABLE TRIGGER trg_recalc_position_fifo;
ALTER TABLE investments DISABLE TRIGGER update_tier_on_investment;
ALTER TABLE investments DISABLE TRIGGER investment_tier_update_trigger;

-- Test the purchase now
-- If it works, we know the issue is in one of these triggers
-- If it still fails, the issue is in instant_buy_shares itself
