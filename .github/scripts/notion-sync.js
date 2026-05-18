import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const TOKEN         = process.env.NOTION_TOKEN;
const DB_ID         = process.env.NOTION_DB_ID;
const SITE_BASE_URL = (process.env.SITE_BASE_URL || '').replace(/\/$/, '');
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || '';

function generateUploadCode(folder) {
  return crypto.createHmac('sha256', UPLOAD_SECRET).update(folder).digest('hex').slice(0, 8);
}

function extractSheetId(url) {
  if (!url) return '';
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

function generateAppsScript(sheetId) {
  return `// RSVP Script — sheet: https://docs.google.com/spreadsheets/d/${sheetId}
// 1. Go to https://script.google.com → New project
// 2. Replace all code with this file
// 3. Deploy → New Deployment → Web App → Execute as: Me → Who has access: Anyone → Deploy
// 4. Copy the Web App URL → paste it as googleScriptUrl in the wedding data JSON

function doPost(e) {
  var sheet = SpreadsheetApp.openById("${sheetId}").getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp","Attendance","Full Name","Email","Phone","Guests","Guest Info","Allergies","Message"]);
  }

  var p = e.parameter;
  sheet.appendRow([
    new Date(),
    p.attendance,
    p.full_name,
    p.email,
    p.phone,
    p.guests,
    p.guest_info,
    p.allergies,
    p.message
  ]);

  return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}

function normalizeDate(dateStr) {
  if (!dateStr) return dateStr;
  // Already ISO (YYYY-MM-DD or YYYY-MM-DDTHH:MM) — pass through
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  // Dot or slash separated: 2026.06.21 or 2026/06/21 (preserves any trailing time)
  const dotSlash = dateStr.match(/^(\d{4})[./](\d{2})[./](\d{2})(.*)/);
  if (dotSlash) return `${dotSlash[1]}-${dotSlash[2]}-${dotSlash[3]}${dotSlash[4]}`;
  // Human-readable fallback (e.g. "14 June 2026") — reformat to YYYY-MM-DD via UTC
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return dateStr; // unparseable — leave as-is
}

function toMapEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('/embed') || url.includes('output=embed')) return url;
  if (url.includes('<iframe')) {
    const m = url.match(/src="([^"]+)"/);
    if (m) return m[1];
  }
  const coordMatch = url.match(/@([-\d.]+),([-\d.]+)/);
  if (coordMatch) return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=17&output=embed`;
  return url;
}

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
async function queryTasksByStatus(status) {
  const result = await notionRequest(`/v1/databases/${DB_ID}/query`, 'POST', {
    filter: { property: 'Status', select: { equals: status } }
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
    mapUrl:  toMapEmbedUrl(t.map_url || '')
  };
  if (t.parking_url) location.parkingUrl = t.parking_url;

  // Build schedule from uketsuke_time + party_time if provided, else use default
  const schedule = (t.uketsuke_time || t.party_time)
    ? [
        t.uketsuke_time && {
          time: t.uketsuke_time,
          title: { en: 'Reception', ja: '受付開始', my: 'ဧည့်ခံခြင်း' },
          icon: 'reception'
        },
        t.party_time && {
          time: t.party_time,
          title: { en: 'Banquet Begins', ja: '開宴', my: 'မင်္ဂလာဧည့်ခံပွဲ စတင်ခြင်း' },
          icon: 'party'
        }
      ].filter(Boolean)
    : defaultData.schedule;

  return {
    ...defaultData,
    groomName:       { en: t.groom_en || '', ja: t.groom_ja || '', my: t.groom_my || '' },
    brideName:       { en: t.bride_en || '',  ja: t.bride_ja || '',  my: t.bride_my || '' },
    date:            normalizeDate(t.date || ''),
    showCountdown:   true,
    rsvpDeadline:    normalizeDate(t.rsvp_deadline || ''),
    location,
    googleFormUrl:   '',
    googleScriptUrl: t.google_script_url || '',
    showSchedule:    true,
    schedule,
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
async function markDone(pageId, invitationUrl, uploadUrl, uploadCode, scriptUrl) {
  const properties = {
    Status: { select: { name: 'Done' } }
  };

  const noteLines = [];
  if (invitationUrl) noteLines.push(`🔗 Invitation: ${invitationUrl}`);
  if (uploadUrl)     noteLines.push(`📸 Upload: ${uploadUrl}`);
  if (uploadCode)    noteLines.push(`🔑 Upload Code: ${uploadCode}`);
  if (scriptUrl)     noteLines.push(`📝 RSVP Script: ${scriptUrl}`);

  if (noteLines.length) {
    properties.Note = {
      rich_text: [{ type: 'text', text: { content: noteLines.join('\n') } }]
    };
  }

  await notionRequest(`/v1/pages/${pageId}`, 'PATCH', { properties });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function processTask(task, publicDir, defaultData, fullProcess) {
  const titleProp = Object.values(task.properties).find(p => p.type === 'title');
  const title = titleProp?.title?.map(t => t.plain_text).join('') || '(untitled)';
  console.log(`\n${fullProcess ? 'Processing' : 'Refreshing note'}: "${title}" (${task.id})`);

  const tableData = await getTableData(task.id);
  if (!tableData || !tableData.groom_en || !tableData.bride_en) {
    console.log('  Skipping: table missing or groom_en/bride_en fields not found.');
    return false;
  }

  const slug = str => str.toLowerCase().trim().split(/\s+/)[0];
  const groomSlug = slug(tableData.groom_en);
  const brideSlug = slug(tableData.bride_en);
  const folder    = `${groomSlug}_${brideSlug}`;

  const invitationUrl = SITE_BASE_URL ? `${SITE_BASE_URL}/?event=${groomSlug}.${brideSlug}` : '';
  const uploadUrl     = SITE_BASE_URL ? `${SITE_BASE_URL}/?mode=upload&event=${groomSlug}.${brideSlug}` : '';
  const uploadCode    = UPLOAD_SECRET ? generateUploadCode(folder) : '';

  const sheetId   = extractSheetId(tableData.google_sheet_url || '');
  const scriptUrl = (sheetId && SITE_BASE_URL)
    ? `${SITE_BASE_URL}/scripts/${folder}_rsvp_script.js`
    : '';

  if (fullProcess) {
    const jsonPath  = path.join(publicDir, `wedding-data_${folder}.json`);
    const photoDir  = path.join(publicDir, 'photos', folder);
    const scriptDir = path.join(publicDir, 'scripts');

    const data = buildWeddingData(tableData, defaultData);
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  Written: public/wedding-data_${folder}.json`);

    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true });
      fs.writeFileSync(path.join(photoDir, '.gitkeep'), '');
      console.log(`  Created: public/photos/${folder}/`);
    }

    if (sheetId) {
      if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
      const scriptPath = path.join(scriptDir, `${folder}_rsvp_script.js`);
      fs.writeFileSync(scriptPath, generateAppsScript(sheetId), 'utf8');
      console.log(`  Written: public/scripts/${folder}_rsvp_script.js`);
    }
  }

  await markDone(task.id, invitationUrl, uploadUrl, uploadCode, scriptUrl);
  console.log(`  Notion: note updated | Upload Code: ${uploadCode || '(no secret set)'}`);
  return true;
}

async function main() {
  const repoRoot    = path.resolve(__dirname, '../../');
  const publicDir   = path.join(repoRoot, 'public');
  const defaultData = JSON.parse(fs.readFileSync(path.join(publicDir, 'wedding-data.json'), 'utf8'));

  console.log('Querying Notion for Ready and Done tasks...');
  const [readyTasks, doneTasks] = await Promise.all([
    queryTasksByStatus('Ready'),
    queryTasksByStatus('Done')
  ]);
  console.log(`Found ${readyTasks.length} Ready, ${doneTasks.length} Done task(s).`);

  let processed = 0;

  for (const task of readyTasks) {
    if (!isWebInvitationTask(task)) continue;
    if (await processTask(task, publicDir, defaultData, true)) processed++;
  }

  // Refresh notes on Done tasks so upload code stays in sync with UPLOAD_SECRET
  for (const task of doneTasks) {
    if (!isWebInvitationTask(task)) continue;
    await processTask(task, publicDir, defaultData, false);
  }

  console.log(`\nDone — ${processed} new couple(s) processed.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
