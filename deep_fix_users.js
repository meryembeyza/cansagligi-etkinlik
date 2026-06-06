const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepFix() {
  console.log("Starting deep fix...");

  // 1. Fetch all auth users
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Auth fetch error:", authError);
    return;
  }

  for (const authUser of authUsers) {
    console.log(`\nProcessing ${authUser.email}...`);

    // Ensure metadata has full_name
    if (!authUser.user_metadata || !authUser.user_metadata.full_name) {
      console.log(`- Updating auth metadata for ${authUser.email}`);
      await supabase.auth.admin.updateUserById(authUser.id, {
        user_metadata: { full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0] }
      });
    }

    // Ensure public.users record exists and is complete
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (publicError) {
      console.error(`- Public user fetch error for ${authUser.email}:`, publicError);
      continue;
    }

    if (!publicUser) {
      console.log(`- Creating missing public.users record for ${authUser.email}`);
      await supabase.from('users').insert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        phone_number: '+905555555555',
        role: 'unit_head',
        region: 'İstanbul Avrupa',
        university: 'Bilinmeyen Üniversite',
        unit_name: 'Sosyal Çalışmalar Birimi',
        is_approved: true,
        kvkk_approved: true
      });
    } else {
      // Update existing record to ensure it's approved and has basic info
      const updates = {};
      if (!publicUser.is_approved) updates.is_approved = true;
      if (!publicUser.full_name || publicUser.full_name === 'mm') updates.full_name = 'Meryem Beyza Utkulu'; // Specific fix for the user
      if (!publicUser.phone_number || publicUser.phone_number === '') updates.phone_number = '+905555555555';
      if (!publicUser.unit_name || publicUser.unit_name === '') updates.unit_name = 'Sosyal Çalışmalar Birimi';
      
      if (Object.keys(updates).length > 0) {
        console.log(`- Updating public.users for ${authUser.email}:`, updates);
        await supabase.from('users').update(updates).eq('id', authUser.id);
      } else {
        console.log(`- Public user ${authUser.email} looks good.`);
      }
    }
  }

  console.log("\nDeep fix completed.");
}

deepFix();
