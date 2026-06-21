import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { charmsData } from './js/charms-data.js';

// Load environmental variables from .env.local
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
  console.log('----------------------------------------------------');
  console.log('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  console.log('Please add them to .env.local like this:');
  console.log('SUPABASE_URL="https://your-project.supabase.co"');
  console.log('SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('----------------------------------------------------');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log(`Seeding ${charmsData.length} charms into Supabase database...`);
  
  // Format charms data to match charms table schema
  const formattedCharms = charmsData.map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    price: Number(c.price),
    image: c.image,
    stock: 99 // Default stock to 99 items
  }));

  // Chunk inputs to avoid hitting Supabase size limit
  const chunkSize = 50;
  for (let i = 0; i < formattedCharms.length; i += chunkSize) {
    const chunk = formattedCharms.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('charms')
      .upsert(chunk, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Error seeding chunk at index ${i}:`, error.message);
    } else {
      console.log(`✅ Seeded chunk starting at index ${i}`);
    }
  }

  console.log('Seeding process completed!');
}

seed().catch(err => {
  console.error('Unexpected error during seeding:', err);
  process.exit(1);
});
