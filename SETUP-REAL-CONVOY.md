# REAL CONVOY SETUP

The v4 build supports real invite-code rooms.

## 1. Supabase (required for real friends)

Create a Supabase project and copy:

- Project URL
- Publishable/anon key

Paste them into `config.js`:

```js
window.CONVOY_CONFIG = {
  SUPABASE_URL: "https://YOURPROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  MAPBOX_ACCESS_TOKEN: ""
};
```

This build uses:
- Presence = who is currently in the convoy
- Broadcast = GPS / speed / position packets

A friend who enters the SAME invite code joins the same Realtime channel and appears on the map.

The current prototype uses a public Realtime channel whose effective secret is the invite code. For a wider/public release, switch the rooms to private channels and add Realtime Authorization policies.

## 2. Mapbox (optional, for in-app route navigation)

Create a Mapbox public browser token and paste it into `MAPBOX_ACCESS_TOKEN`.

Then tap the ➤ button in the app, search for a destination, and Convoy will request a traffic-aware driving route.

## 3. GitHub

Upload/replace:
- index.html
- styles.css
- app.js
- sw.js
- config.js

Keep:
- manifest.json
- icon-192.png
- icon-512.png

Then wait for GitHub Pages to redeploy and fully close/reopen the home-screen PWA.

## Safety / privacy notes

- Location sharing starts only after joining a convoy and enabling GPS.
- Leaving/closing the room stops that browser session's live updates.
- Invite codes should be treated like passwords for the current prototype.
