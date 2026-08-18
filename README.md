# Convoy Web v1

This is the browser/PWA version of the Convoy prototype.

## Current features

- phone-friendly live convoy map
- route polyline
- saved meet/fuel spots
- convoy markers
- speed displayed above each person's name
- convoy leader marker
- convoy spread distance
- invite code
- start/end convoy
- real GPS for your own marker
- simulated movement for other friends
- PWA manifest + service worker
- iPhone Add to Home Screen support

## Test locally on a computer

Run a simple local web server inside this folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

GPS usually requires HTTPS when hosted publicly.

## Put it on your iPhone

Host these files on any HTTPS static host, then open the URL in Safari.

In Safari:
Share → Add to Home Screen

It will open like a standalone app.

## Important

Friends are still simulated in this v1. The next backend stage is what makes multiple real phones share:
- latitude
- longitude
- speed
- heading
- convoy membership
- invite codes

A realtime backend such as Supabase can be added without changing the overall UI.
