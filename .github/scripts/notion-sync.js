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

async function queryAllTasks() {
  const result = await notionRequest(`/v1/databases/${DB_ID}/query`, 'POST', {});
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
  if (!tableBlock) return { data: null, tableBlockId: null };

  const rowsRes = await notionRequest(`/v1/blocks/${tableBlock.id}/children`);
  const data = {};
  for (const row of (rowsRes.results || [])) {
    if (row.type !== 'table_row') continue;
    const cells = row.table_row.cells;
    const key = cells[0]?.map(c => c.plain_text).join('').trim();
    const val = cells[1]?.map(c => c.plain_text).join('').trim();
    if (key) data[key] = val || '';
  }
  return { data, tableBlockId: tableBlock.id };
}

// ─── GENERATE JSON ────────────────────────────────────────────────────────────
function buildWeddingData(t, defaultData, existing = null) {
  const galleryCount = parseInt(t.gallery_count || String(existing?.gallery?.length || 3), 10);
  const gallery = Array.from({ length: galleryCount }, (_, i) =>
    `./photos/[event-folder]/gallery${i + 1}.jpg`
  );

  const location = {
    name: {
      en: t.venue_name_en || existing?.location?.name?.en    || '',
      ja: t.venue_name_ja || existing?.location?.name?.ja    || '',
      my: t.venue_name_my || existing?.location?.name?.my    || '',
    },
    address: {
      en: t.venue_address_en || existing?.location?.address?.en || '',
      ja: t.venue_address_ja || existing?.location?.address?.ja || '',
      my: t.venue_address_my || existing?.location?.address?.my || '',
    },
    mapUrl: toMapEmbedUrl(t.map_url || '') || existing?.location?.mapUrl || '',
  };
  const parkingUrl = t.parking_url || existing?.location?.parkingUrl || '';
  if (parkingUrl) location.parkingUrl = parkingUrl;

  // Build schedule from uketsuke_time + party_time if provided, else use default
  const uketsukeTime = t.uketsuke_time || existing?.schedule?.find(s => s.icon === 'reception')?.time || '';
  const partyTime    = t.party_time    || existing?.schedule?.find(s => s.icon === 'party')?.time    || '';
  const schedule = (uketsukeTime || partyTime)
    ? [
        uketsukeTime && {
          time: uketsukeTime,
          title: { en: 'Reception', ja: '受付開始', my: 'ဧည့်ခံခြင်း' },
          icon: 'reception'
        },
        partyTime && {
          time: partyTime,
          title: { en: 'Banquet Begins', ja: '開宴', my: 'မင်္ဂလာဧည့်ခံပွဲ စတင်ခြင်း' },
          icon: 'party'
        }
      ].filter(Boolean)
    : defaultData.schedule;

  return {
    ...defaultData,
    // Preserve fields customised directly in GitHub JSON (overrides defaultData)
    ...(existing && {
      message: existing.message,
      theme:   existing.theme,
      fonts:   existing.fonts,
      visuals: existing.visuals,
      faq:     existing.faq,
    }),
    // Notion wins if set; fallback to existing GitHub value
    groomName: {
      en: t.groom_en || existing?.groomName?.en || '',
      ja: t.groom_ja || existing?.groomName?.ja || '',
      my: t.groom_my || existing?.groomName?.my || '',
    },
    brideName: {
      en: t.bride_en || existing?.brideName?.en || '',
      ja: t.bride_ja || existing?.brideName?.ja || '',
      my: t.bride_my || existing?.brideName?.my || '',
    },
    date:            normalizeDate(t.date || '')            || existing?.date         || '',
    showCountdown:   true,
    rsvpDeadline:    normalizeDate(t.rsvp_deadline || '')   || existing?.rsvpDeadline || '',
    location,
    googleFormUrl:   '',
    googleScriptUrl: t.google_script_url || existing?.googleScriptUrl || '',
    musicUrl:        t.music_url         || existing?.musicUrl         || '',
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

// ─── WRITE BACK TO NOTION TABLE ───────────────────────────────────────────────
async function writeBackToNotionTable(tableBlockId, key, value) {
  await notionRequest(`/v1/blocks/${tableBlockId}/children`, 'PATCH', {
    children: [
      {
        type: 'table_row',
        table_row: {
          cells: [
            [{ type: 'text', text: { content: key } }],
            [{ type: 'text', text: { content: value } }]
          ]
        }
      }
    ]
  });
}

// ─── RUN WRITE-BACK ───────────────────────────────────────────────────────────
async function runWriteBack(tableData, tableBlockId, data) {
  if (!tableBlockId) return;
  const candidates = [
    ['groom_en',          data.groomName?.en || ''],
    ['groom_ja',          data.groomName?.ja || ''],
    ['groom_my',          data.groomName?.my || ''],
    ['bride_en',          data.brideName?.en || ''],
    ['bride_ja',          data.brideName?.ja || ''],
    ['bride_my',          data.brideName?.my || ''],
    ['date',              data.date || ''],
    ['rsvp_deadline',     data.rsvpDeadline || ''],
    ['venue_name_en',     data.location?.name?.en || ''],
    ['venue_name_ja',     data.location?.name?.ja || ''],
    ['venue_name_my',     data.location?.name?.my || ''],
    ['venue_address_en',  data.location?.address?.en || ''],
    ['venue_address_ja',  data.location?.address?.ja || ''],
    ['venue_address_my',  data.location?.address?.my || ''],
    ['map_url',           data.location?.mapUrl || ''],
    ['parking_url',       data.location?.parkingUrl || ''],
    ['uketsuke_time',     data.schedule?.find(s => s.icon === 'reception')?.time || ''],
    ['party_time',        data.schedule?.find(s => s.icon === 'party')?.time     || ''],
    ['google_script_url', data.googleScriptUrl || ''],
    ['music_url',         data.musicUrl || ''],
    ['message',           data.message ? JSON.stringify(data.message) : ''],
    ['theme',             data.theme   ? JSON.stringify(data.theme)   : ''],
    ['fonts',             data.fonts   ? JSON.stringify(data.fonts)   : ''],
    ['visuals',           data.visuals ? JSON.stringify(data.visuals) : ''],
  ];
  for (const [key, value] of candidates) {
    if (!tableData[key] && value) {
      await writeBackToNotionTable(tableBlockId, key, value);
      console.log(`  Write-back: ${key} → Notion`);
    }
  }
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

  const { data: tableData, tableBlockId } = await getTableData(task.id);
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

  // Always build merged data (needed for write-back in all cases)
  const jsonPath = path.join(publicDir, `wedding-data_${folder}.json`);
  const existing = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : null;
  const data = buildWeddingData(tableData, defaultData, existing);

  if (fullProcess) {
    const photoDir  = path.join(publicDir, 'photos', folder);
    const scriptDir = path.join(publicDir, 'scripts');

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

  // Write back to Notion for ALL cases (Ready, Done, and any other status)
  await runWriteBack(tableData, tableBlockId, data);

  await markDone(task.id, invitationUrl, uploadUrl, uploadCode, scriptUrl);
  console.log(`  Notion: note updated | Upload Code: ${uploadCode || '(no secret set)'}`);
  return true;
}

// Write back JSON → Notion for tasks with any status (no status change)
async function writeBackTask(task, publicDir, defaultData) {
  const titleProp = Object.values(task.properties).find(p => p.type === 'title');
  const title = titleProp?.title?.map(t => t.plain_text).join('') || '(untitled)';

  const { data: tableData, tableBlockId } = await getTableData(task.id);
  if (!tableData?.groom_en || !tableData?.bride_en || !tableBlockId) return;

  const slug = s => s.toLowerCase().trim().split(/\s+/)[0];
  const folder   = `${slug(tableData.groom_en)}_${slug(tableData.bride_en)}`;
  const jsonPath = path.join(publicDir, `wedding-data_${folder}.json`);
  if (!fs.existsSync(jsonPath)) return;

  const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const data = buildWeddingData(tableData, defaultData, existing);
  await runWriteBack(tableData, tableBlockId, data);
  console.log(`  Write-back complete for "${title}"`);
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

  const processedIds = new Set();
  let processed = 0;

  for (const task of readyTasks) {
    if (!isWebInvitationTask(task)) continue;
    if (await processTask(task, publicDir, defaultData, true)) {
      processedIds.add(task.id);
      processed++;
    }
  }

  for (const task of doneTasks) {
    if (!isWebInvitationTask(task)) continue;
    await processTask(task, publicDir, defaultData, false);
    processedIds.add(task.id);
  }

  // Write back JSON → Notion for any remaining couples not covered above.
  // Count existing couple JSON files — if all are already covered by Ready/Done,
  // skip the expensive queryAllTasks() call entirely.
  const coupleJsonCount = fs.readdirSync(publicDir)
    .filter(f => /^wedding-data_.+\.json$/.test(f) && f !== 'wedding-data.json').length;

  if (processedIds.size < coupleJsonCount) {
    console.log('\nSome couples may have other statuses — syncing JSON → Notion...');
    const allTasks = await queryAllTasks();
    for (const task of allTasks) {
      if (processedIds.has(task.id) || !isWebInvitationTask(task)) continue;
      await writeBackTask(task, publicDir, defaultData);
    }
  } else {
    console.log('\nAll known couples covered by Ready/Done pass — skipping full scan.');
  }

  console.log(`\nDone — ${processed} new couple(s) processed.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
