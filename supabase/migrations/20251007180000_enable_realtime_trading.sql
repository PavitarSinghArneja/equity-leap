-- Enable Realtime for Trading Tables
-- This migration enables Supabase Realtime functionality for the trading platform

-- Enable realtime on share_sell_requests table for live order book updates
ALTER PUBLICATION supabase_realtime ADD TABLE share_sell_requests;

-- Enable realtime on investments table for live portfolio updates
ALTER PUBLICATION supabase_realtime ADD TABLE investments;

-- Enable realtime on escrow_balances for live wallet balance updates
ALTER PUBLICATION supabase_realtime ADD TABLE escrow_balances;

-- Add comment explaining realtime setup
COMMENT ON TABLE share_sell_requests IS 'Share sell orders with realtime updates enabled for trading platform';
COMMENT ON TABLE investments IS 'User property investments with realtime updates for portfolio changes';
COMMENT ON TABLE escrow_balances IS 'User wallet balances with realtime updates for trading';
