# Amoré Wedding Tokyo Invitation

A premium, customizable wedding invitation single-page application built with React and Tailwind CSS.

## 🚀 How to Customize & Deploy

This project uses a "Configuration File" workflow. You edit the site using the local Admin Panel, export the config, and push it to GitHub.

### Step 1: Configure Locally
1. Run the project on your computer:
   ```bash
   npm run dev
   ```
2. Open the Admin Panel in your browser:
   ```
   http://localhost:5173/?mode=admin
   ```
   *(Note: 5173 is the default port, check your terminal if it's different)*

3. Customize everything (Names, Photos, Schedule).

### Step 2: Export Configuration
1. In the Admin Panel, go to the **Settings** tab.
2. Click **Download wedding-data.json**.

### Step 3: Update the Project
1. Move the downloaded `wedding-data.json` file into the **`public/`** folder of your project directory.
2. Confirm you are overwriting the existing file.

### Step 4: Deploy
Commit your changes and push to GitHub.

```bash
git add public/wedding-data.json
git commit -m "Update wedding details"
git push origin main
```

Your website will automatically update on GitHub Pages.

---

## 🆘 Troubleshooting

**"I cannot push to GitHub"**
If your `git push` fails, ensure you are using **Image URLs** in the Admin Panel (e.g., links to Imgur or Google Photos) instead of uploading large files directly. The `wedding-data.json` file should be small (less than 1MB).

**"My changes aren't showing up"**
1. Make sure you moved the JSON file to the `public/` folder, not the root folder.
2. Clear your browser cache or try opening the live site in Incognito mode.

---

## 📊 RSVP with Google Sheets
1. Create a Google Sheet.
2. Use the code in `google_script_template.js` in Apps Script.
3. Deploy as Web App (Access: Anyone).
4. Paste the Web App URL into the Admin Panel.