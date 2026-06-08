-- 1. Create bursary_events table
CREATE TABLE IF NOT EXISTS public.bursary_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create bursary_attendances table
CREATE TABLE IF NOT EXISTS public.bursary_attendances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.bursary_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'not_attending')),
    excuse_text TEXT,
    has_attended BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- 3. Add club_role to users table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'club_role') THEN
        ALTER TABLE public.users ADD COLUMN club_role TEXT;
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.bursary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bursary_attendances ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for bursary_events
-- Anyone authenticated can view bursary events
CREATE POLICY "Anyone can view bursary events" 
ON public.bursary_events FOR SELECT 
TO authenticated 
USING (true);

-- Only general_admin and rep_head can insert/update/delete bursary events
-- Wait, we need to check the user's role from the users table.
CREATE POLICY "Admins and rep_heads can manage bursary events" 
ON public.bursary_events FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('general_admin', 'rep_head')
  )
);

-- 6. Create RLS Policies for bursary_attendances
-- A user can see their own attendances, admins can see all
CREATE POLICY "Users can view their own attendances, admins can view all" 
ON public.bursary_attendances FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('general_admin', 'rep_head')
  )
);

-- A user can insert/update their own attendances
CREATE POLICY "Users can insert their own attendances" 
ON public.bursary_attendances FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attendances" 
ON public.bursary_attendances FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Admins can update/delete any attendance (optional, but good for management)
CREATE POLICY "Admins can manage all attendances" 
ON public.bursary_attendances FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('general_admin', 'rep_head')
  )
);
