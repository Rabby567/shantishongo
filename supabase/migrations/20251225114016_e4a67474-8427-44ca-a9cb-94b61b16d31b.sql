-- Enable realtime for attendance table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;

-- Enable realtime for moderator_approvals table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderator_approvals;

-- Enable realtime for guests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;