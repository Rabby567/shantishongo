-- Add unique constraint to prevent duplicate attendance per guest per day
ALTER TABLE attendance ADD CONSTRAINT attendance_guest_per_day_unique UNIQUE (guest_id, scan_date);