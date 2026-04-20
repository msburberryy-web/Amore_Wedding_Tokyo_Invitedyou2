import crypto from 'crypto';
import https from 'https';

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN  || '';
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || '';
const REPO_OWNER    = 'msburberryy-web';
const REPO_NAME     = 'Amore_Wedding_Tokyo_Invitedyou_v1.2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function generatePassphrase(folder) {
  return crypto.createHmac('sha256', UPLOAD_SECRET).update(folder).digest('hex').slice(0, 8);
}

function githubRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        Authorization:  `Bearer ${GITHUB_TOKEN}`,
        'User-Agent':   'amore-upload-service',
        'Content-Type': 'application/json',
        Accept:         'application/vnd.github+json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) })
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getFileSha(filePath) {
  const res = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
    'GET'
  );
  return res.status === 200 ? res.body.sha : null;
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event, passphrase, fileName, content } = req.body || {};

  if (!event || !passphrase || !fileName || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const folder   = event.replace(/\./g, '_');
  const expected = generatePassphrase(folder);

  if (passphrase !== expected) {
    return res.status(401).json({ error: 'Invalid upload code' });
  }

  const filePath = `public/photos/${folder}/${fileName}`;
  const sha      = await getFileSha(filePath);

  const result = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
    'PUT',
    {
      message: `upload: ${fileName} for ${folder}`,
      content,
      ...(sha && { sha })
    }
  );

  if (result.status === 200 || result.status === 201) {
    return res.status(200).json({ success: true, file: fileName });
  }

  return res.status(500).json({ error: 'GitHub API error', details: result.body });
}
