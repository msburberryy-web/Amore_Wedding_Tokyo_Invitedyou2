# Wedding Photo Organization

## Structure

This folder organizes wedding photos by event using the URL parameter `event`.

### Example:

- **URL:** `yoursite.com?event=aki.mimi`
  - Loads photos from `./photos/aki_mimi/`
  - Also loads `wedding-data_aki_mimi.json` configuration

- **URL:** `yoursite.com` (no event param)
  - Loads photos from the template paths `./photos/[event-folder]/`
  - Loads `wedding-data.json` configuration

## Required Photos per Event

Each event folder should contain these images:

```
photos/
├── aki_mimi/           # For event=aki.mimi
│   ├── cover.jpg       # Hero/banner image
│   ├── groom.jpg       # Groom portrait
│   ├── bride.jpg       # Bride portrait
│   ├── gallery1.jpg    # Gallery image 1
│   ├── photo1.jpg      # Gallery image 2
│   └── photo2.jpg      # Gallery image 3
├── john_jane/          # For event=john.jane
│   ├── cover.jpg
│   ├── groom.jpg
│   ├── bride.jpg
│   ├── gallery1.jpg
│   ├── photo1.jpg
│   └── photo2.jpg
└── default/            # Template folder structure
    └── (empty - not used)
```

## Configuration

For each event, create a corresponding `wedding-data_*.json` file in the `/public/` folder:

- `wedding-data_aki_mimi.json` for `event=aki.mimi`
- `wedding-data_john_jane.json` for `event=john.jane`

The JSON file should include image paths in this format:

```json
{
  "images": {
    "hero": "./photos/[event-folder]/cover.jpg",
    "groom": "./photos/[event-folder]/groom.jpg",
    "bride": "./photos/[event-folder]/bride.jpg"
  },
  "gallery": [
    "./photos/[event-folder]/gallery1.jpg",
    "./photos/[event-folder]/cover.jpg",
    "./photos/[event-folder]/photo1.jpg",
    "./photos/[event-folder]/photo2.jpg"
  ]
}
```

The app will automatically replace `[event-folder]` with the actual event folder name (e.g., `aki_mimi`).

## Notes

- Event parameter values use dots (`.`), which are converted to underscores (`_`) for folder names
  - Example: `aki.mimi` → `aki_mimi`
- Always include all required image files to avoid 404 errors
- Use responsive image formats (JPEG, WebP)
- Optimize images for web performance
