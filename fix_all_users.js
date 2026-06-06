const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUsers() {
  console.log("Fetching all public.users...");
  const { data: users, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  console.log(`Found ${users.length} users. Checking for issues...`);

  for (const user of users) {
    let needsUpdate = false;
    const updates = {};

    if (user.is_approved !== true) {
      console.log(`Approving user: ${user.email}`);
      updates.is_approved = true;
      needsUpdate = true;
    }

    if (!user.full_name) {
      console.log(`Setting default name for: ${user.email}`);
      updates.full_name = user.email.split('@')[0];
      needsUpdate = true;
    }

    if (!user.phone_number) {
      console.log(`Setting default phone for: ${user.email}`);
      updates.phone_number = '+905555555555';
      needsUpdate = true;
    }

    if (!user.role) {
      console.log(`Setting default role (unit_head) for: ${user.email}`);
      updates.role = 'unit_head';
      needsUpdate = true;
    }

    if (!user.region) {
      console.log(`Setting default region (İstanbul Avrupa) for: ${user.email}`);
      updates.region = 'İstanbul Avrupa';
      needsUpdate = true;
    }

    if (!user.university) {
      console.log(`Setting default university for: ${user.email}`);
      updates.university = 'Bilinmeyen Üniversite';
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase.from('users').update(updates).eq('id', user.id);
      if (updateError) {
        console.error(`Error updating ${user.email}:`, updateError);
      } else {
        console.log(`Successfully updated ${user.email}`);
      }
    } else {
      console.log(`${user.email} looks OK.`);
    }
  }
}

fixUsers();
