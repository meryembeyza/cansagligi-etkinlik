const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzgwNDAsImV4cCI6MjA5Mzc1NDA0MH0.P1tztFd18sE0G7d3nIvmGoo-uzx5BlZl-Gfva3TkBYw';

// 1. Service role to get a user and event
const adminSupabase = createClient(supabaseUrl, supabaseKey);

async function testUserFlow() {
  // Find a user who is a unit_head and has an event that is 'Onaylandı' or 'Gerçekleşti'
  const { data: events } = await adminSupabase
    .from('events')
    .select('id, created_by')
    .limit(1);
    
  if (!events || events.length === 0) {
    console.log("No events found");
    return;
  }
  
  const testEvent = events[0];
  console.log("Found event:", testEvent.id, "created by:", testEvent.created_by);

  // We cannot easily login without password. Wait, we can generate a JWT using jsonwebtoken maybe? 
  // But wait, the issue could be something else. Let's just create a test error output on the page.
}

testUserFlow();
