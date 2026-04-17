import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const TOKEN        = process.env.NOTION_TOKEN;
const DB_ID        = process.env.NOTION_DB_ID;
const SITE_BASE_URL = (process.env.SITE_BASE_URL || '').replace(/\/$/, '');

if (!TOKEN || !DB_ID) {
  console.error('Missing required env vars: NOTION_TOKEN, NOTION_DB_ID');
  process.exit(1);
}

// ─── NOTION API ───────────────────────────────────────────────────────────────
function notionRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path,
      method,
      headers: {
        Authorization:    `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── QUERY ────────────────────────────────────────────────────────────────────
async function queryReadyTasks() {
  const result = await notionRequest(`/v1/databases/${DB_ID}/query`, 'POST', {
    filter: { property: 'Status', select: { equals: 'Ready' } }
  });
  return result.results || [];
}

// ─── IDENTIFY ─────────────────────────────────────────────────────────────────
function isWebInvitationTask(page) {
  // Primary: "Wedding Action Items" relation contains "Web invitation preparation"
  const waiProp = page.properties['Wedding Action Items'];
  if (waiProp?.type === 'relation' && waiProp.relation?.length > 0) return true;

  // Fallback: title contains "web invitation"
  const titleProp = Object.values(page.properties).find(p => p.type === 'title');
  const title = titleProp?.title?.map(t => t.plain_text).join('') || '';
  return title.toLowerCase().includes('web invitation');
}

// ─── READ TABLE ───────────────────────────────────────────────────────────────
async function getTableData(pageId) {
  const blocksRes = await notionRequest(`/v1/blocks/${pageId}/children`);
  const tableBlock = (blocksRes.results || []).find(b => b.type === 'table');
  if (!tableBlock) return null;

  const rowsRes = await notionRequest(`/v1/blocks/${tableBlock.id}/children`);
  const data = {};
  for (const row of (rowsRes.results || [])) {
    if (row.type !== 'table_row') continue;
    const cells = row.table_row.cells;
    const key = cells[0]?.map(c => c.plain_text).join('').trim();
    const val = cells[1]?.map(c => c.plain_text).join('').trim();
    if (key) data[key] = val || '';
  }
  return data;
}

// ─── GENERATE JSON ────────────────────────────────────────────────────────────
function buildWeddingData(t, defaultData) {
  const galleryCount = parseInt(t.gallery_count || '3', 10);
  const gallery = Array.from({ length: galleryCount }, (_, i) =>
    `./photos/[event-folder]/gallery${i + 1}.jpg`
  );

  const location = {
    name:    { en: t.venue_name_en || '',    ja: t.venue_name_ja || '',    my: t.venue_name_my || '' },
    address: { en: t.venue_address_en || '', ja: t.venue_address_ja || '', my: t.venue_address_my || '' },
    mapUrl:  t.map_url || ''
  };
  if (t.parking_url) location.parkingUrl = t.parking_url;

  return {
    ...defaultData,
    groomName:       { en: t.groom_en || '', ja: t.groom_ja || '', my: t.groom_my || '' },
    brideName:       { en: t.bride_en || '',  ja: t.bride_ja || '',  my: t.bride_my || '' },
    date:            t.date || '',
    showCountdown:   true,
    rsvpDeadline:    t.rsvp_deadline || '',
    location,
    googleFormUrl:   '',
    googleScriptUrl: t.google_script_url || '',
    showSchedule:    true,
    showGallery:     true,
    gallery,
    images: {
      hero:  './photos/[event-folder]/cover.jpg',
      groom: './photos/[event-folder]/groom.jpg',
      bride: './photos/[event-folder]/bride.jpg'
    }
  };
}

// ─── UPDATE NOTION ────────────────────────────────────────────────────────────
async function markDone(pageId, invitationUrl) {
  const properties = {
    Status: { select: { name: 'Done' } }
  };
  if (invitationUrl) {
    properties.Note = {
      rich_text: [{ type: 'text', text: { content: invitationUrl } }]
    };
  }
  await notionRequest(`/v1/pages/${pageId}`, 'PATCH', { properties });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const repoRoot    = path.resolve(__dirname, '../../');
  const publicDir   = path.join(repoRoot, 'public');
  const defaultData = JSON.parse(fs.readFileSync(path.join(publicDir, 'wedding-data.json'), 'utf8'));

  console.log('Querying Notion for Ready tasks...');
  const tasks = await queryReadyTasks();
  console.log(`Found ${tasks.length} Ready task(s).`);

  let processed = 0;

  for (const task of tasks) {
    if (!isWebInvitationTask(task)) continue;

    const titleProp = Object.values(task.properties).find(p => p.type === 'title');
    const title = titleProp?.title?.map(t => t.plain_text).join('') || '(untitled)';
    console.log(`\nProcessing: "${title}" (${task.id})`);

    const tableData = await getTableData(task.id);
    if (!tableData || !tableData.groom_en || !tableData.bride_en) {
      console.log('  Skipping: table missing or groom_en/bride_en fields not found.');
      continue;
    }

    const slug = str => str.toLowerCase().trim().replace(/\s+/g, '_');
    const groomSlug = slug(tableData.groom_en);
    const brideSlug = slug(tableData.bride_en);
    const folder   = `${groomSlug}_${brideSlug}`;
    const jsonPath = path.join(publicDir, `wedding-data_${folder}.json`);
    const photoDir = path.join(publicDir, 'photos', folder);

    const data = buildWeddingData(tableData, defaultData);
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  Written: public/wedding-data_${folder}.json`);

    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true });
      fs.writeFileSync(path.join(photoDir, '.gitkeep'), '');
      console.log(`  Created: public/photos/${folder}/`);
    }

    const invitationUrl = SITE_BASE_URL
      ? `${SITE_BASE_URL}/?event=${groomSlug}.${brideSlug}`
      : '';

    await markDone(task.id, invitationUrl);
    console.log(`  Notion: Status → Done${invitationUrl ? ` | Note → ${invitationUrl}` : ''}`);

    processed++;
  }

  console.log(`\nDone — ${processed} couple(s) processed.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
