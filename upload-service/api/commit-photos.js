import crypto from 'crypto';
import { commitTree } from './_github.js';

const UPLOAD_SECRET = process.env.UPLOAD_SECRET || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function generatePassphrase(folder) {
  return crypto.createHmac('sha256', UPLOAD_SECRET).update(folder).digest('hex').slice(0, 8);
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event, passphrase, blobs } = req.body || {};
  if (!event || !passphrase || !Array.isArray(blobs) || blobs.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const folder = event.replace(/\./g, '_');
  if (passphrase !== generatePassphrase(folder)) {
    return res.status(401).json({ error: 'Invalid upload code' });
  }

  try {
    const commitSha = await commitTree(blobs, `upload: photos for ${folder}`);
    return res.status(200).json({ success: true, commit: commitSha });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
