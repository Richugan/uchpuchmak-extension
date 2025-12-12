# Steam Profile Custom Buttons

Chrome extension that adds a “Custom Links” showcase to Steam profiles. You set label + base URL, and the extension appends the viewed profile’s ID so each button opens the matching page for that profile. Config is saved to Chrome Sync.

## Features
- Adds a Custom Links block on Steam profile pages (`/id/*` and `/profiles/*`).
- Buttons open in new tabs and inherit the profile ID in the URL.
- Button labels and URLs are stored in `chrome.storage.sync` so they stay in sync across devices.
- Options page to add/remove buttons; nothing runs outside Steam profile pages.

## Install (Unpacked)
1. Run `npm install`.
2. Build: `npm run build` (outputs `dist/content.js` and `dist/options.js`).
3. In Chrome, visit `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.

## Updating Your Buttons
1. Click the extension icon to open the options popup.
2. Add a label and a base URL (e.g., `https://example.com/profile/`), then **Save**.
3. Visit a Steam profile to see your buttons in the Custom Links showcase.

## Permissions
- `storage`: Save and load your button labels/URLs via Chrome Sync.
- `https://steamcommunity.com/*`: Allow the content script to run on Steam profile pages to inject the Custom Links showcase.

## Development
- Source: `src/content.ts` (profile injection) and `src/options.ts` (options UI).
- Build: `npm run build`
- Clean: `npm run clean`
