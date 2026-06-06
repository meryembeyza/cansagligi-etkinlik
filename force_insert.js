const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceInsert() {
  const usersToInsert = [
    {
      id: 'dd77ff75-cd3f-4efe-b296-18fe03668f4b',
      email: '35meryembeyza2004@gmail.com',
      full_name: 'Meryem Beyza',
      phone_number: 'Belirtilmedi',
      university: 'Belirtilmedi',
      region: 'İstanbul Avrupa',
      unit_name: 'Belirtilmedi',
      role: 'general_admin',
      kvkk_approved: true,
      is_approved: true
    }
  ];

  for (const user of usersToInsert) {
    console.log(`Force inserting ${user.email}...`);
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      university: user.university,
      region: user.region,
      unit_name: user.unit_name,
      role: user.role,
      kvkk_approved: user.kvkk_approved,
      is_approved: user.is_approved
    });

    if (error) {
      console.error(`Error inserting ${user.email}:`, error);
    } else {
      console.log(`Successfully inserted ${user.email}`);
    }
  }
}

forceInsert();
