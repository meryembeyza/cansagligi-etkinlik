const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function cleanOrphanedUsers() {
  console.log("Fetching auth users...");
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }
  
  console.log(`Found ${users.length} auth users.`);
  
  const { data: publicUsers, error: dbError } = await supabase.from('users').select('id');
  if (dbError) {
    console.error("DB Error:", dbError);
    return;
  }
  
  const publicUserIds = new Set(publicUsers.map(u => u.id));
  
  let deletedCount = 0;
  for (const user of users) {
    if (!publicUserIds.has(user.id)) {
      console.log(`Orphaned user found: ${user.email} (ID: ${user.id}). Deleting...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Failed to delete ${user.email}:`, deleteError);
      } else {
        console.log(`Successfully deleted ${user.email}`);
        deletedCount++;
      }
    }
  }
  
  console.log(`Cleanup finished. Deleted ${deletedCount} orphaned users.`);
}

cleanOrphanedUsers();
