import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  try {
    let imgUrl = req.query?.img || null;
    const rawRid = req.query?.rid || null;
    const rid =
      rawRid && typeof rawRid === 'string'
        ? rawRid.trim().slice(0, 200)
        : null;

    if (!imgUrl || typeof imgUrl !== 'string') {
      return res.status(400).send('Missing img param');
    }

    imgUrl = imgUrl.trim();

    if (imgUrl.startsWith('//')) {
      imgUrl = 'https:' + imgUrl;
    } else if (!/^https?:\/\//i.test(imgUrl)) {
      imgUrl = 'https://' + imgUrl;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(imgUrl);
    } catch {
      return res.status(400).send('Invalid image URL');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).send('Invalid protocol');
    }

    const imageResponse = await fetch(imgUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    });

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).send('Image fetch failed');
    }

    const contentType = imageResponse.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).send('URL does not return an image');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const visit = {
      rid,
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
      image_url: imgUrl,
      user_agent: req.headers['user-agent'] || null
    };

    const { error } = await supabase.from('visits').insert(visit);

    if (error) {
      console.error('Supabase insert error:', error);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    const contentLength = imageResponse.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('api/i crash:', error);
    return res.status(500).send(error.message || 'Server error');
  }
}