const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log("Fetching auth users...");
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  const authUsers = authData.users;
  console.log(`Found ${authUsers.length} auth users.`);

  console.log("Fetching public users...");
  const { data: publicData, error: publicError } = await supabase.from('users').select('id');
  if (publicError) {
    console.error("Public error:", publicError);
    return;
  }
  
  const publicUserIds = publicData.map(u => u.id);
  console.log(`Found ${publicUserIds.length} public users.`);

  for (const user of authUsers) {
    if (!publicUserIds.includes(user.id)) {
      console.log(`User ${user.email} (${user.id}) is missing in public.users. Inserting...`);
      // Default dummy data if we don't know it, or extract from user_metadata
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        student_id: user.user_metadata?.student_id || null,
        phone_number: user.user_metadata?.phone_number || 'Belirtilmedi',
        university: user.user_metadata?.university || 'Belirtilmedi',
        region: user.user_metadata?.region || 'İstanbul Avrupa', // Fallback to a valid enum
        unit_name: user.user_metadata?.unit_name || 'Belirtilmedi',
        role: user.user_metadata?.role || 'unit_head', // Fallback to a valid enum
        kvkk_approved: true,
        is_approved: true // Auto-approve them so they can login immediately!
      });
      
      if (insertError) {
        console.error(`Failed to insert ${user.email}:`, insertError);
      } else {
        console.log(`Successfully inserted and approved ${user.email}.`);
      }
    } else {
        // If they exist, let's make sure they are approved so the user can test
        await supabase.from('users').update({ is_approved: true }).eq('id', user.id);
        console.log(`User ${user.email} already in public.users. Marked as approved.`);
    }
  }
  
  console.log("Done.");
}

fix();
