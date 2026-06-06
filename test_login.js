const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzgwNDAsImV4cCI6MjA5Mzc1NDA0MH0.P1tztFd18sE0G7d3nIvmGoo-uzx5BlZl-Gfva3TkBYw'; // anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: '35meryembeyza2004@gmail.com',
    password: 'cansagligi123'
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login successful! Session:", !!data.session);
    
    // Check public users
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .maybeSingle();
        
    if (userError) {
        console.error("Public user error:", userError);
    } else {
        console.log("Public user found:", !!user);
        console.log("Is approved:", user?.is_approved);
    }
  }
}

testLogin();
