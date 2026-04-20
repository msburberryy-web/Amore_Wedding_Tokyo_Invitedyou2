import crypto from 'crypto';

const UPLOAD_SECRET = process.env.UPLOAD_SECRET || '';

function generatePassphrase(folder) {
  return crypto.createHmac('sha256', UPLOAD_SECRET).update(folder).digest('hex').slice(0, 8);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event, passphrase } = req.body || {};
  if (!event || !passphrase) return res.status(400).json({ error: 'Missing fields' });

  const folder = event.replace(/\./g, '_');
  const expected = generatePassphrase(folder);

  if (passphrase !== expected) return res.status(401).json({ error: 'Invalid upload code' });
  return res.status(200).json({ ok: true });
}
