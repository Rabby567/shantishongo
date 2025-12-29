-- Change scanned_by from text to uuid to properly reference profiles
ALTER TABLE public.attendance 
ALTER COLUMN scanned_by TYPE uuid USING scanned_by::uuid;

-- Add foreign key constraint to attendance.scanned_by referencing profiles
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_scanned_by_fkey 
FOREIGN KEY (scanned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;