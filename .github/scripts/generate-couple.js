import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── DATA SOURCE ──────────────────────────────────────────────────────────────
// Currently hardcoded for testing. Will be replaced with Notion API fetch.
const couples = [
  {
    groom:        { en: "Hiro",   ja: "ヒロ",  my: "ဟီရို" },
    bride:        { en: "Yuki",   ja: "ゆき",  my: "ယူကီ" },
    date:         "2026-09-20T18:00:00",
    rsvpDeadline: "2026-08-31",
    galleryCount: 3,
    location: {
      name: {
        en: "Batur Tokyo",
        ja: "バトゥール東京",
        my: "Batur Tokyo"
      },
      address: {
        en: "1F KDX Higashi-Shinjuku Building, 2-4-10 Kabukicho, Shinjuku-ku, Tokyo 160-0021",
        ja: "〒160-0021 東京都新宿区歌舞伎町2-4-10 KDX東新宿ビル1F",
        my: "1F KDX Higashi-Shinjuku Building, 2-4-10 Kabukicho, Shinjuku-ku, Tokyo 160-0021"
      },
      mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.161296291768!2d139.70624809999998!3d35.697648199999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cd8b5b7ac67%3A0x9ce2f5afc23c6d3a!2sWedding%26Party%20BATUR%20Tokyo!5e0!3m2!1sen!2sjp!4v1766542348811!5m2!1sen!2sjp",
      parkingUrl: ""
    },
    googleScriptUrl: ""
  }
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const repoRoot   = path.resolve(__dirname, '../../');
const publicDir  = path.join(repoRoot, 'public');
const photosDir  = path.join(publicDir, 'photos');
const defaultRaw = fs.readFileSync(path.join(publicDir, 'wedding-data.json'), 'utf8');
const defaultData = JSON.parse(defaultRaw);

function buildGallery(count) {
  const gallery = [];
  for (let i = 1; i <= count; i++) {
    gallery.push(`./photos/[event-folder]/gallery${i}.jpg`);
  }
  return gallery;
}

function folderName(couple) {
  return `${couple.groom.en.toLowerCase()}_${couple.bride.en.toLowerCase()}`;
}

// ─── GENERATE ─────────────────────────────────────────────────────────────────
let created = 0;
let updated = 0;

for (const couple of couples) {
  const folder   = folderName(couple);
  const jsonPath = path.join(publicDir, `wedding-data_${folder}.json`);
  const photoDir = path.join(photosDir, folder);

  const data = {
    ...defaultData,
    groomName:       couple.groom,
    brideName:       couple.bride,
    date:            couple.date,
    showCountdown:   true,
    rsvpDeadline:    couple.rsvpDeadline,
    location:        couple.location,
    googleFormUrl:   "",
    googleScriptUrl: couple.googleScriptUrl || "",
    showSchedule:    true,
    showGallery:     true,
    gallery:         buildGallery(couple.galleryCount),
    images: {
      hero:  "./photos/[event-folder]/cover.jpg",
      groom: "./photos/[event-folder]/groom.jpg",
      bride: "./photos/[event-folder]/bride.jpg"
    }
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const existed = fs.existsSync(jsonPath);
  fs.writeFileSync(jsonPath, jsonStr, 'utf8');
  existed ? updated++ : created++;
  console.log(`${existed ? 'Updated' : 'Created'}: public/wedding-data_${folder}.json`);

  if (!fs.existsSync(photoDir)) {
    fs.mkdirSync(photoDir, { recursive: true });
    fs.writeFileSync(path.join(photoDir, '.gitkeep'), '');
    console.log(`Created photo folder: public/photos/${folder}/`);
  }
}

console.log(`\nDone — ${created} created, ${updated} updated.`);
