const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  for (const user of authData.users) {
    const { data: publicData, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id);
      
    console.log(`Auth User: ${user.email} (ID: ${user.id})`);
    if (publicError) {
      console.log(`Public error for ${user.id}:`, publicError);
    } else {
      console.log(`Public user data for ${user.id}:`, publicData);
    }
  }
}

check();
