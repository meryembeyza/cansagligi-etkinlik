const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPasswords() {
  console.log("Fetching all auth users...");
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error fetching users:", authError);
    return;
  }

  for (const user of users) {
    if (user.email !== 'test1778875623084@example.com') { // don't reset the test account just in case
      console.log(`Resetting password for ${user.email} to 'cansagligi123'`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { 
          password: 'cansagligi123',
          email_confirm: true // ensuring the email is marked as confirmed
        }
      );
      if (updateError) {
        console.error(`Error updating password for ${user.email}:`, updateError);
      } else {
        console.log(`Successfully reset password and confirmed email for ${user.email}`);
      }
    }
  }
}

resetPasswords();
