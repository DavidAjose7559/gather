-- Add ride coordination fields to event_rsvps
ALTER TABLE public.event_rsvps
  ADD COLUMN ride_status text CHECK (ride_status IN ('driving', 'need_ride', 'own_way', 'unsure')),
  ADD COLUMN area text,
  ADD COLUMN can_take integer;

-- Add attendance visibility toggle to events
ALTER TABLE public.events
  ADD COLUMN show_attendance boolean NOT NULL DEFAULT false;

-- Ride matches created by admin (driver + riders)
CREATE TABLE public.ride_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events ON DELETE CASCADE NOT NULL,
  driver_rsvp_id uuid REFERENCES public.event_rsvps ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now()
);

-- Riders included in a ride match
CREATE TABLE public.ride_match_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.ride_matches ON DELETE CASCADE NOT NULL,
  rsvp_id uuid REFERENCES public.event_rsvps ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  notified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (match_id, rsvp_id)
);
