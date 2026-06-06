const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
let NEXT_PUBLIC_SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) NEXT_PUBLIC_SUPABASE_URL = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_SERVICE_ROLE_KEY = line.split('=')[1].trim();
});

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function syncUsers() {
    console.log('Fetching auth users...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
    }

    console.log(`Found ${users.length} users in Auth.`);

    for (const authUser of users) {
        console.log(`Checking user ${authUser.email}...`);
        
        // Check if user exists in public.users
        const { data: publicUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (checkError && checkError.code === 'PGRST116') {
            // User does not exist in public.users
            console.log(`User ${authUser.email} missing from public.users. Inserting...`);
            
            const fullName = authUser.user_metadata?.full_name || 'Kullanıcı';
            
            const { error: insertError } = await supabase.from('users').insert([{
                id: authUser.id,
                email: authUser.email,
                full_name: fullName,
                phone_number: '+905555555555',
                role: 'general_admin', // Varsayılan yetki
                region: 'İstanbul Avrupa',
                university: 'Sistem',
                unit_name: 'Yönetim',
                is_approved: true,
                kvkk_approved: true
            }]);

            if (insertError) {
                console.error(`Failed to insert ${authUser.email}:`, insertError);
            } else {
                console.log(`Successfully synced ${authUser.email}!`);
            }
        } else if (publicUser && !publicUser.is_approved) {
             console.log(`User ${authUser.email} exists but is not approved. Approving...`);
             await supabase.from('users').update({ is_approved: true }).eq('id', authUser.id);
             console.log(`Approved ${authUser.email}.`);
        } else {
            console.log(`User ${authUser.email} is already synced and approved.`);
        }
    }
    console.log('Done!');
}

syncUsers();
