-- Check what the alert trigger does

SELECT pg_get_functiondef('trg_alert_on_reservation'::regproc);
