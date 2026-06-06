const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gdfuimrrhypvjytunhqm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnVpbXJyaHlwdmp5dHVuaHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE3ODA0MCwiZXhwIjoyMDkzNzU0MDQwfQ.oPbDNG_VWWxLQo2k3k8lTIjf_A8XFs8zoOlxmv96ec0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorageAndDB() {
  console.log("Setting up storage and database...");

  // 1. Create buckets (avatars, posters)
  const buckets = ['avatars', 'posters'];
  for (const bucketName of buckets) {
    const { data: getBucket, error: getBucketError } = await supabase.storage.getBucket(bucketName);
    
    if (getBucketError && getBucketError.message.includes("The resource was not found")) {
      console.log(`Creating bucket: ${bucketName}`);
      const { data, error } = await supabase.storage.createBucket(bucketName, { public: true });
      if (error) console.error(`Failed to create bucket ${bucketName}:`, error);
      else console.log(`Bucket ${bucketName} created successfully.`);
    } else if (getBucket) {
        console.log(`Bucket ${bucketName} already exists.`);
        // Ensure bucket is public
        await supabase.storage.updateBucket(bucketName, { public: true });
    } else {
        console.error(`Error checking bucket ${bucketName}:`, getBucketError);
    }
  }

  // 2. We cannot run ALTER TABLE directly with supabase-js unless we use RPC or raw SQL.
  // Instead, we will use a postgres query via an RPC function, or we can just ask the user to run SQL, 
  // or use the rest API to send a SQL query if we have the postgres connection string.
  // Wait, I can create a SQL file and execute it with postgres connection string, but I don't have the direct postgres connection string.
  // Let me just create an RPC function or instruct the user, OR I can use the existing 'execute_sql' RPC if they have one?
  // Let's check if they have a way to run SQL.
}

setupStorageAndDB();
