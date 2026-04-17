/**
 * Run this once locally to print your Notion Tasks DB structure.
 * Usage: NOTION_TOKEN=your_token NOTION_DB_ID=your_db_id node .github/scripts/notion-discover.js
 */

import https from 'https';

const TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_DB_ID;

if (!TOKEN || !DB_ID) {
  console.error('Usage: NOTION_TOKEN=xxx NOTION_DB_ID=xxx node .github/scripts/notion-discover.js');
  process.exit(1);
}

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
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

async function main() {
  // 1. DB properties
  console.log('\n=== DATABASE PROPERTIES ===');
  const db = await request(`/v1/databases/${DB_ID}`);
  if (db.status === 401 || db.object === 'error') {
    console.error('API error:', db.message);
    process.exit(1);
  }
  const props = db.properties;
  for (const [name, prop] of Object.entries(props)) {
    console.log(`  "${name}" → type: ${prop.type}`);
    if (prop.type === 'select')   console.log(`    options: ${prop.select.options.map(o => o.name).join(', ')}`);
    if (prop.type === 'status')   console.log(`    options: ${prop.status.options.map(o => o.name).join(', ')}`);
    if (prop.type === 'multi_select') console.log(`    options: ${prop.multi_select.options.map(o => o.name).join(', ')}`);
  }

  // 2. Sample pages (first 5)
  console.log('\n=== SAMPLE TASKS (first 5) ===');
  const result = await request(`/v1/databases/${DB_ID}/query`, 'POST', { page_size: 5 });
  for (const page of result.results) {
    const titleProp = Object.values(page.properties).find(p => p.type === 'title');
    const title = titleProp?.title?.map(t => t.plain_text).join('') || '(no title)';
    console.log(`\n  Page ID: ${page.id}`);
    console.log(`  Title:   ${title}`);
    for (const [name, prop] of Object.entries(page.properties)) {
      if (prop.type === 'title') continue;
      let val = '—';
      if (prop.type === 'select')       val = prop.select?.name ?? '—';
      if (prop.type === 'status')       val = prop.status?.name ?? '—';
      if (prop.type === 'multi_select') val = prop.multi_select?.map(o => o.name).join(', ') || '—';
      if (prop.type === 'rich_text')    val = prop.rich_text?.map(t => t.plain_text).join('') || '—';
      if (prop.type === 'url')          val = prop.url ?? '—';
      if (prop.type === 'date')         val = prop.date?.start ?? '—';
      console.log(`    [${name}] (${prop.type}): ${val}`);
    }
  }

  console.log('\n=== DONE — paste this output back to Claude ===\n');
}

main().catch(console.error);
