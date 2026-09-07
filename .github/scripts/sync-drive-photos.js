/**
 * sync-drive-photos.js
 *
 * Downloads all images from a Google Drive folder into public/photos/{eventFolder}/
 * and updates the gallery array + image paths in the matching wedding-data JSON.
 *
 * Usage:
 *   node .github/scripts/sync-drive-photos.js <driveFolderId> <eventFolder>
 *
 * Required env:
 *   GOOGLE_SA_KEY  — Google service account JSON (base64-encoded or raw JSON string)
 *
 * Naming convention expected in Drive folder:
 *   cover.jpg / cover.jpeg / cover.png  → images.hero
 *   groom.jpg  / groom.jpeg             → images.groom
 *   bride.jpg  / bride.jpeg             → images.bride
 *   gallery1.jpg, gallery2.jpg …        → gallery[]
 *   (any other image is treated as a gallery photo, appended in name order)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const [,, FOLDER_ID, EVENT_FOLDER] = process.argv;
if (!FOLDER_ID || !EVENT_FOLDER) {
  console.error('Usage: node sync-drive-photos.js <driveFolderId> <eventFolder>');
  process.exit(1);
}

// ── Google Service Account Auth ───────────────────────────────────────────────

function parseSaKey() {
  const raw = process.env.GOOGLE_SA_KEY || '';
  if (!raw) throw new Error('GOOGLE_SA_KEY env var is not set');
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = base64url(sign.sign(sa.private_key));
  const jwt = `${header}.${payload}.${sig}`;

  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (!json.access_token) reject(new Error(`Auth failed: ${data}`));
        else resolve(json.access_token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Drive API helpers ─────────────────────────────────────────────────────────

function driveRequest(path, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'www.googleapis.com',
      path,
      headers: { Authorization: `Bearer ${token}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function downloadFile(fileId, token, destPath) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files/${fileId}?alt=media`,
      headers: { Authorization: `Bearer ${token}` },
    }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // follow redirect
        https.get(res.headers.location, res2 => {
          const out = fs.createWriteStream(destPath);
          res2.pipe(out);
          out.on('finish', () => out.close(resolve));
          out.on('error', reject);
        }).on('error', reject);
        return;
      }
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    });
    req.on('error', reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sa = parseSaKey();
  const token = await getAccessToken(sa);
  console.log('✓ Authenticated with Google Drive');

  // List all image files in the folder
  const listPath = `/drive/v3/files?q=${encodeURIComponent(
    `'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`
  )}&fields=files(id,name,mimeType)&pageSize=50`;

  const { files } = await driveRequest(listPath, token);
  if (!files || files.length === 0) {
    console.error('No image files found in Drive folder');
    process.exit(1);
  }
  console.log(`Found ${files.length} image(s):`, files.map(f => f.name).join(', '));

  // Ensure output directory exists
  const photosDir = path.join(__dirname, '..', '..', 'public', 'photos', EVENT_FOLDER);
  fs.mkdirSync(photosDir, { recursive: true });

  // Categorise files
  const named    = { cover: null, groom: null, bride: null };
  const gallery  = [];

  for (const file of files) {
    const base = file.name.toLowerCase().replace(/\.[^.]+$/, ''); // strip extension
    const ext  = file.name.match(/\.[^.]+$/)?.[0] || '.jpg';
    if (base === 'cover')       named.cover = { ...file, ext };
    else if (base === 'groom')  named.groom = { ...file, ext };
    else if (base === 'bride')  named.bride = { ...file, ext };
    else                        gallery.push({ ...file, ext });
  }

  // Sort gallery by file name
  gallery.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Download named images
  for (const [role, file] of Object.entries(named)) {
    if (!file) { console.warn(`  ⚠ No ${role} image found`); continue; }
    const dest = path.join(photosDir, `${role}${file.ext}`);
    await downloadFile(file.id, token, dest);
    console.log(`  ↓ ${role}${file.ext}`);
  }

  // Download gallery images, renaming to gallery1.jpg, gallery2.jpg …
  const galleryPaths = [];
  for (let i = 0; i < gallery.length; i++) {
    const file = gallery[i];
    const dest = path.join(photosDir, `gallery${i + 1}${file.ext}`);
    await downloadFile(file.id, token, dest);
    console.log(`  ↓ gallery${i + 1}${file.ext}  ← ${file.name}`);
    galleryPaths.push(`./photos/${EVENT_FOLDER}/gallery${i + 1}${file.ext}`);
  }

  // Update the wedding-data JSON
  const jsonPath = path.join(__dirname, '..', '..', 'public', `wedding-data_${EVENT_FOLDER}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`  ⚠ JSON not found at ${jsonPath} — skipping JSON update`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const ext = (role) => named[role]?.ext || '.jpg';

  if (named.cover) data.images.hero  = `./photos/${EVENT_FOLDER}/cover${ext('cover')}`;
  if (named.groom) data.images.groom = `./photos/${EVENT_FOLDER}/groom${ext('groom')}`;
  if (named.bride) data.images.bride = `./photos/${EVENT_FOLDER}/bride${ext('bride')}`;
  if (galleryPaths.length > 0) data.gallery = galleryPaths;

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ Updated ${path.basename(jsonPath)}: ${galleryPaths.length} gallery photo(s)`);
}

main().catch(e => { console.error(e); process.exit(1); });
