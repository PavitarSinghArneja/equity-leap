-- Check what the admin_settle_reservation function does

SELECT pg_get_functiondef('admin_settle_reservation'::regproc);
