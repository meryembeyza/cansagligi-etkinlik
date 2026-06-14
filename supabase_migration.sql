-- 01_bursiyer_events.sql
-- Create bursiyer_events table

CREATE TABLE IF NOT EXISTS public.bursiyer_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    published_by UUID NOT NULL REFERENCES public.users(id),
    published_at TIMESTAMPTZ DEFAULT now(),
    participant_type TEXT NOT NULL CHECK (participant_type IN ('all', 'university_only')),
    display_title TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    event_end_date TIMESTAMPTZ,
    city TEXT NOT NULL,
    venue TEXT,
    description TEXT,
    speakers JSONB DEFAULT '[]'::jsonb,
    poster_url TEXT,
    requires_registration BOOLEAN DEFAULT false,
    registration_url TEXT,
    registration_deadline TIMESTAMPTZ,
    registration_required_warning BOOLEAN DEFAULT false,
    contact_person JSONB,
    is_published BOOLEAN DEFAULT true,
    university TEXT NOT NULL
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bursiyer_events_city ON public.bursiyer_events(city);
CREATE INDEX IF NOT EXISTS idx_bursiyer_events_date ON public.bursiyer_events(event_date);
CREATE INDEX IF NOT EXISTS idx_bursiyer_events_published ON public.bursiyer_events(is_published);

-- Enable Row Level Security
ALTER TABLE public.bursiyer_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can read 'all' participant type OR their own university's events (if published)
CREATE POLICY "Bursiyerler can view published events for all or their university"
ON public.bursiyer_events
FOR SELECT
USING (
    is_published = true AND (
        participant_type = 'all' OR 
        university = (SELECT university FROM public.users WHERE id = auth.uid())
    )
);

-- Policy 2: Representatives can insert events for their own university
CREATE POLICY "Representatives can insert their own university events"
ON public.bursiyer_events
FOR INSERT
WITH CHECK (
    university = (SELECT university FROM public.users WHERE id = auth.uid())
);

-- Policy 3: Representatives can update events for their own university
CREATE POLICY "Representatives can update their own university events"
ON public.bursiyer_events
FOR UPDATE
USING (
    university = (SELECT university FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
    university = (SELECT university FROM public.users WHERE id = auth.uid())
);

-- Policy 4: Representatives can delete their own published events
CREATE POLICY "Representatives can delete their own university events"
ON public.bursiyer_events
FOR DELETE
USING (
    university = (SELECT university FROM public.users WHERE id = auth.uid())
);
