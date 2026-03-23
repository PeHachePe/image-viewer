import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  try {
    const rawRid = req.query?.rid || '';
    const rid = typeof rawRid === 'string' ? rawRid.trim() : '';

    if (!rid) {
      return res.status(400).json({
        ok: false,
        error: 'Missing rid'
      });
    }

    const { data, error } = await supabase
      .from('visits')
      .select(`
        id,
        rid,
        ip,
        country,
        region,
        city,
        latitude,
        longitude,
        image_url,
        user_agent,
        created_at
      `)
      .eq('rid', rid)
      .not('country', 'eq', 'ES')
      .or('region.is.null,region.neq.AR')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      visits: data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Server error'
    });
  }
}