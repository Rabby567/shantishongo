-- Add scan_date column for unique constraint
ALTER TABLE attendance ADD COLUMN scan_date DATE DEFAULT CURRENT_DATE NOT NULL;