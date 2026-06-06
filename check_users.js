const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log("Listing users in database...");
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error("Error fetching users:", error);
  } else if (data) {
    console.log(`Found ${data.length} users:`);
    data.forEach(u => {
      console.log(`- Email: ${u.email} | Role: ${u.role} | Is Approved: ${u.is_approved} | Full Name: ${u.full_name}`);
    });
  }
}

listUsers();
