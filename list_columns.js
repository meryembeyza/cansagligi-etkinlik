const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'users' });
  if (error) {
    // If RPC doesn't exist, try a simple select and check keys
    const { data: userData, error: selectError } = await supabase.from('users').select('*').limit(1);
    if (selectError) {
      console.error("Error:", selectError);
    } else if (userData && userData.length > 0) {
      console.log("Columns in users table:", Object.keys(userData[0]));
    } else {
      console.log("No data in users table to check columns.");
    }
  } else {
    console.log("Columns:", data);
  }
}

listColumns();
