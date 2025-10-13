-- Re-enable the triggers after testing
-- Run this after you've tested the purchase

ALTER TABLE investments ENABLE TRIGGER trg_recalc_position_fifo;
ALTER TABLE investments ENABLE TRIGGER update_tier_on_investment;
ALTER TABLE investments ENABLE TRIGGER investment_tier_update_trigger;
