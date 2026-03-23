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
        user_agent,
        created_at
      `)
      .eq('rid', rid)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    const visits = (data || []).filter(
      (visit) => !(visit.country === 'ES' && visit.region === 'AR')
    );

    return res.status(200).json({
      ok: true,
      visits
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Server error'
    });
  }
}