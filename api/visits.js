import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function areSameVisitData(a, b) {
  return (
    (a.country || '') === (b.country || '') &&
    (a.region || '') === (b.region || '') &&
    (a.city || '') === (b.city || '') &&
    String(a.latitude ?? '') === String(b.latitude ?? '') &&
    String(a.longitude ?? '') === String(b.longitude ?? '') &&
    (a.user_agent || '') === (b.user_agent || '')
  );
}

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

    const filtered = (data || []).filter(
      (visit) => !(visit.country === 'ES' && visit.region === 'AR')
    );

    const groupedMap = new Map();

    for (const visit of filtered) {
      const ipKey = visit.ip || 'Sin IP';

      if (!groupedMap.has(ipKey)) {
        groupedMap.set(ipKey, {
          id: visit.id,
          rid: visit.rid,
          ip: visit.ip,
          country: visit.country,
          region: visit.region,
          city: visit.city,
          latitude: visit.latitude,
          longitude: visit.longitude,
          user_agent: visit.user_agent,
          created_at: visit.created_at,
          count: 1,
          children: []
        });
        continue;
      }

      const parent = groupedMap.get(ipKey);
      parent.count += 1;

      const baseRow = {
        id: visit.id,
        rid: visit.rid,
        ip: visit.ip,
        country: visit.country,
        region: visit.region,
        city: visit.city,
        latitude: visit.latitude,
        longitude: visit.longitude,
        user_agent: visit.user_agent,
        created_at: visit.created_at
      };

      const parentComparable = {
        country: parent.country,
        region: parent.region,
        city: parent.city,
        latitude: parent.latitude,
        longitude: parent.longitude,
        user_agent: parent.user_agent
      };

      const alreadyInChildren = parent.children.some((child) =>
        areSameVisitData(child, baseRow)
      );

      if (!areSameVisitData(parentComparable, baseRow) && !alreadyInChildren) {
        parent.children.push(baseRow);
      }
    }

    return res.status(200).json({
      ok: true,
      visits: Array.from(groupedMap.values())
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Server error'
    });
  }
}