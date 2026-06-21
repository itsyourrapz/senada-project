import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error (missing keys).' });
  }

  try {
    const { customer, size, charms, receiptImage } = req.body;

    // Validate inputs
    if (!customer || !customer.name || !customer.email || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Informasi customer tidak lengkap.' });
    }

    if (!size || !Array.isArray(charms)) {
      return res.status(400).json({ error: 'Data rancangan gelang tidak lengkap.' });
    }

    if (!receiptImage) {
      return res.status(400).json({ error: 'Bukti transfer/struk pembayaran harus diunggah.' });
    }

    // 1. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch charms to verify price and stock
    const charmIds = charms.map(c => c.id).filter(id => id && !id.startsWith('custom-'));
    
    let dbCharms = [];
    if (charmIds.length > 0) {
      const { data, error: fetchError } = await supabase
        .from('charms')
        .select('id, name, price, stock')
        .in('id', charmIds);

      if (fetchError) throw fetchError;
      dbCharms = data || [];
    }

    // 3. Security: Calculate price and verify stock
    const BASE_BRACELET_PRICE = 34000;
    let calculatedTotalPrice = BASE_BRACELET_PRICE;

    for (const item of charms) {
      if (item.id.startsWith('custom-')) {
        const customPrice = Number(item.price) || 185000; // standard custom photo price
        calculatedTotalPrice += customPrice;
      } else {
        const dbCharm = dbCharms.find(dc => dc.id === item.id);
        if (!dbCharm) {
          return res.status(400).json({ error: `Charm dengan ID ${item.id} tidak ditemukan.` });
        }
        if (dbCharm.stock <= 0) {
          return res.status(400).json({ error: `Maaf, stok charm "${dbCharm.name}" sedang habis.` });
        }
        calculatedTotalPrice += Number(dbCharm.price);
      }
    }

    // 4. Generate unique order ID
    const orderId = `SENADA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 5. Write order to Supabase
    const { error: insertError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_address: customer.address,
        size: size,
        charms: charms,
        total_price: calculatedTotalPrice,
        status: 'pending_verification',
        receipt_image: receiptImage
      });

    if (insertError) {
      console.error('Database write error:', insertError);
      throw new Error(`Gagal menyimpan order ke database: ${insertError.message}`);
    }

    // 6. Decrement stock of purchased charms
    console.log(`📉 Decrementing stock for charms in order ${orderId}...`);
    for (const item of charms) {
      if (item.id && !item.id.startsWith('custom-')) {
        const dbCharm = dbCharms.find(dc => dc.id === item.id);
        if (dbCharm) {
          const newStock = Math.max(0, dbCharm.stock - 1);
          const { error: stockUpdateErr } = await supabase
            .from('charms')
            .update({ stock: newStock })
            .eq('id', item.id);

          if (stockUpdateErr) {
            console.error(`⚠️ Failed to decrement stock for charm ${dbCharm.name}:`, stockUpdateErr);
          } else {
            console.log(`Decrement stock of "${dbCharm.name}" from ${dbCharm.stock} to ${newStock}`);
          }
        }
      }
    }

    // 7. Return success response
    return res.status(200).json({ orderId });

  } catch (error) {
    console.error('Order submission error:', error);
    return res.status(500).json({ error: error.message || 'Gagal mengirim pesanan.' });
  }
}
