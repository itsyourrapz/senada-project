import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env variables
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = val;
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestOrder() {
  console.log('Fetching latest order from Supabase...');
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, customer_phone, total_price, status, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching order:', error.message);
  } else if (data && data.length > 0) {
    console.log('\n--- LATEST ORDER IN DATABASE ---');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No orders found in the table.');
  }
}

checkLatestOrder();
