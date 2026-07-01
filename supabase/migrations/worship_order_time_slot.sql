ALTER TABLE public.worship_order_of_service
ADD COLUMN IF NOT EXISTS time_slot text;
