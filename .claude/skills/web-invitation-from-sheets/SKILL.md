---
name: web-invitation-from-sheets
description: Create a web invitation JSON file for Amoré Wedding Tokyo from the Google Sheets intake form. Use whenever the user says "create web invitation from sheets", "check the intake form", "who is ready for 納品", "create invitation for [name] from the spreadsheet", or "process the sheets intake". Trigger when the user mentions 納品日 or wants to process a couple from the Google Forms spreadsheet.
---

# Web Invitation from Sheets Intake Form

Reads the Amoré Wedding Tokyo Google Sheets intake form, identifies the relevant couple by 納品日 (delivery date), and generates the `public/wedding-data_{groom}_{bride}.json` file for the web invitation site.

## Fixed IDs

| Thing | ID / Value |
|---|---|
| Intake spreadsheet (Google Sheets) | `13F600-zrz2phGl9bt_LIMg-9NSfcwVKSeIcKWsA6Kas` |
| Spreadsheet link | https://docs.google.com/spreadsheets/d/13F600-zrz2phGl9bt_LIMg-9NSfcwVKSeIcKWsA6Kas/edit |
| Tool to read | `mcp__Google_Drive__read_file_content` with `fileId` above |
| Project JSON dir | `public/` in repo root |
| Default data reference | `types.ts` → `DEFAULT_DATA` |

## Spreadsheet Column Map

Columns in order (left to right):

| # | Header | Maps to |
|---|---|---|
| 1 | Timestamp | ignore |
| 2 | Groom Name (Eng) | `groomName.en` |
| 3 | 新郎名前（日本語） | `groomName.ja` |
| 4 | သတို့သားအမည် | `groomName.my` |
| 5 | သတို့သမီးအမည် | `brideName.my` |
| 6 | Bride Name（Eng) | `brideName.en` |
| 7 | 新婦名前（日本語） | `brideName.ja` |
| 8 | 結婚式日 / မင်္ဂလာပွဲရက်စွဲ | `date` — normalize to `YYYY-MM-DD` |
| 9 | 受付タイム / ဧည့်ခံလက်ခံချိန် | schedule item: `time`, icon `reception` |
| 10 | 披露宴タイム / ဧည့်ခံပွဲ အချိန် | schedule item: `time`, icon `party` |
| 11 | 挙式タイム / မင်္ဂလာအခမ်းအနား ※Chapel | schedule item: `time`, icon `ceremony` — omit if blank |
| 12 | 会場の名前 / ပွဲကျင်းပမည့်နေရာအမည် | `location.name.en`, `.ja`, `.my` (same value for all 3 unless obvious translation exists) |
| 13 | 会場住所 / ပွဲကျင်းပမည့်နေရာ လိပ်စာ | `location.address.en`, `.ja`, `.my` (same value for all 3) |
| 14 | 会場の電話番号 | not in JSON — skip |
| 15 | 最終返信日 / နောက်ဆုံးအကြောင်းပြန်ရမည့်ရက် | `rsvpDeadline` — normalize to `YYYY-MM-DD` |
| 16 | Photos Drive link | record for reference — photos uploaded separately |
| 17 | 納品日 | delivery due date — **primary filter** |
| 18 | 納品済 | delivery status; `済` = already delivered |

## Slug / Filename Rule

```
slug(name) = name.toLowerCase().trim().split(/\s+/)[0]   // first word
folder     = slug(groomName.en) + "_" + slug(brideName.en)
filename   = "public/wedding-data_" + folder + ".json"
```

Examples:
- Groom `Banyar Kyaw Kyaw Tun`, Bride `AYE CHAN PHYO` → `banyar_aye`
- Groom `KHIN MAUNG HTAY`, Bride `SHWE YEE WIN` → `khin_shwe`

## Schedule Building

Build the `schedule` array in chronological order. Only include items with a non-empty time:

1. Ceremony (挙式) — icon `ceremony` — if column 11 is filled
2. Reception (受付) — icon `reception` — column 9
3. Banquet/Party (披露宴) — icon `party` — column 10

Time format: normalize to `HH:MM` (24-hour). Strip `時`, `分`, `~`, ranges (take start time), `なし`, `なし`.

## Map URL

The spreadsheet does not include a Google Maps URL. After creating the JSON, generate the `location.mapUrl` by using the venue name + address to form:
```
https://maps.google.com/maps?q=<url-encoded-address>&z=17&output=embed
```
Or use coordinates if you can look them up. The map URL can also be left empty (`""`) and filled in later via Notion sync.

## Default Values (from DEFAULT_DATA in types.ts)

Use `DEFAULT_DATA` for any field not in the spreadsheet:
- `showCountdown: true`
- `showSchedule: true`
- `showGallery: true`
- `gallery`: 5 placeholder paths `./photos/[event-folder]/gallery1.jpg` through `gallery5.jpg`
- `images.hero/groom/bride`: `./photos/[event-folder]/cover.jpg` etc.
- `musicUrl: ""`
- `googleFormUrl: ""`
- `googleScriptUrl: ""`
- `theme`: `{ primary: "#C5A059", text: "#4A4A4A", backgroundTint: "#F5F0E6" }`
- `fonts`: `{ en: '"Cormorant Garamond"', ja: '"Shippori Mincho"', my: '"Padauk"' }`
- `visuals`: `{ enableAnimations: true, enableEnvelope: true }`
- `message`: use `DEFAULT_DATA.message` (standard EN/JA/MY invitation text)
- `faq`: copy in full from `DEFAULT_DATA.faq` (7 items including children note)

## Workflow

1. **Read the spreadsheet** using `mcp__Google_Drive__read_file_content` with `fileId = 13F600-zrz2phGl9bt_LIMg-9NSfcwVKSeIcKWsA6Kas`.

2. **Identify the target row(s):**
   - If the user specifies a name → find that couple's row.
   - If the user says "check 納品日" or "who is ready" → find rows where 納品日 ≤ today AND 納品済 is NOT `済`.
   - If the user gives a specific date → match 納品日 to that date.

3. **Show the parsed values** to the user — folder name, event date, venue, schedule, RSVP deadline — and wait for confirmation before writing files.

4. **Check for existing file:**
   ```
   public/wedding-data_{folder}.json
   ```
   If it exists, show a diff of what would change and ask before overwriting.

5. **Create the JSON file** at `public/wedding-data_{folder}.json`.

6. **Create the photos placeholder** at `public/photos/{folder}/.gitkeep` if the directory doesn't exist yet.

7. **Note the photos Drive link** from column 16 — remind the user that photos need to be downloaded from Drive and placed in `public/photos/{folder}/` with names: `cover.jpg`, `groom.jpg`, `bride.jpg`, `gallery1.jpg` … `gallery5.jpg`.

8. **Commit and push** on branch `claude/wedding-couple-setup-PUUcY`:
   ```
   feat: add {folder} web invitation from Sheets intake
   ```

9. **Optionally trigger Notion sync** — if the couple has a matching Notion page with status "Ready", the sync workflow will pick it up automatically on the next run.

## Notes

- **Do not mark 納品済 in the spreadsheet** — that column is managed manually by the team.
- The `banyar_aye` invitation was the first created from this spreadsheet (2026-08-30 納品日).
- When a couple's venue is MBS Myanmar Buddhist Society (板橋区仲町39-1), the `location.name` is typically in Burmese only in the spreadsheet — add Japanese and English translations manually.
- Time strings from the spreadsheet are sometimes inconsistent: `10:30`, `なえ`, `13時10分`, `15時30分`, `17:00~19:30` — always normalize to `HH:MM`.
