const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking auth.users...");
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Auth error:", authError);
  } else {
    console.log("Auth users count:", authData.users.length);
    authData.users.forEach(u => {
      console.log(`Auth Email: ${u.email}, ID: ${u.id}, Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
    });
  }

  console.log("\nChecking public.users...");
  const { data: publicData, error: publicError } = await supabase.from('users').select('*');
  if (publicError) {
    console.error("Public users error:", publicError);
  } else {
    console.log("Public users count:", publicData.length);
    publicData.forEach(u => {
      const emptyFields = Object.keys(u).filter(key => u[key] === null || u[key] === '');
      console.log(`Public Email: ${u.email}, ID: ${u.id}, Approved: ${u.is_approved}, Role: ${u.role}`);
      console.log(`  Full Name: "${u.full_name}", Phone: "${u.phone_number}", Region: "${u.region}"`);
      if (emptyFields.length > 0) {
        console.log(`  Empty/NULL Fields: ${emptyFields.join(', ')}`);
      }
    });
  }

  // Find mismatches
  if (authData && publicData) {
    const authIds = authData.users.map(u => u.id);
    const publicIds = publicData.map(u => u.id);
    
    const missingInPublic = authData.users.filter(u => !publicIds.includes(u.id));
    if (missingInPublic.length > 0) {
      console.log("\nWARNING: Users in auth but NOT in public.users:");
      missingInPublic.forEach(u => console.log(`- ${u.email} (${u.id})`));
    } else {
      console.log("\nNo auth users missing in public.users.");
    }
  }
}

check();
