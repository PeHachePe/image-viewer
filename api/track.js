import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const rawImageUrl = req.query?.img;
    const imageUrl =
      rawImageUrl && typeof rawImageUrl === 'string'
        ? rawImageUrl.trim()
        : null;

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
      return res.status(500).json({
        ok: false,
        error: 'Faltan variables de entorno de Supabase'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const visit = {
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
      country: req.headers['x-vercel-ip-country'] || null,
      region: req.headers['x-vercel-ip-country-region'] || null,
      city: req.headers['x-vercel-ip-city'] || null,
      latitude: req.headers['x-vercel-ip-latitude']
        ? Number(req.headers['x-vercel-ip-latitude'])
        : null,
      longitude: req.headers['x-vercel-ip-longitude']
        ? Number(req.headers['x-vercel-ip-longitude'])
        : null,
      image_url: imageUrl,
      user_agent: req.headers['user-agent'] || null
    };

    const { error } = await supabase.from('visits').insert(visit);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      visit
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Server error'
    });
  }
}