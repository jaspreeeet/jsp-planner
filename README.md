# 📼 JSP·OS — your second brain, on tape

A retro desktop for your life — planner, med tracker, bullet journal, photo folders,
arcade, self-care toolkit and a 90s mixtape, in one offline-first web app.
Poolsuite energy, Apple polish, zero servers: **your data never leaves your devices.**

## Install on iPhone / iPad (once, ~20 seconds)
1. Open the app URL in **Safari**
2. Tap the **share button** (square with ↑)
3. Tap **Add to Home Screen**
4. Done — it's now a real app icon, full-screen, works offline

On Mac: open the URL in Safari → **File → Add to Dock**.

## iCloud sync between devices (once per device, ~2 min)
The app syncs through your own iCloud Drive using two tiny Shortcuts.
In the **Shortcuts app**, create:

**"Planner Backup"**
1. *Get Clipboard*
2. *Save File* → iCloud Drive → folder `Planner` → name `planner-backup.json` → **Overwrite: ON**

**"Planner Restore"**
1. *Get File* → iCloud Drive → `Planner/planner-backup.json`
2. *Copy to Clipboard*
3. *Open URLs* → `<your app URL>#paste`

Then inside the app: **Sync → ⬆ backup** on one device, **⬇ restore** on another.
iCloud carries the file between your devices automatically.

## Native reminders
**Sync → export meds → calendar alarms (.ics)** — import into Apple Calendar
and your iPhone rings for every dose, no app needed.

## The apps
Today · Plan · Meds · Routines · Journal · Trackers · Unstuck · Care ·
Collect · Photos · Mixtape · Arcade · Buttons (Apple Shortcuts) · Portals · Stats · Sync

Mixtape streams lovingly provided by [SomaFM](https://somafm.com) — listener-supported, commercial-free.

---
Built with vanilla JS, no frameworks, no build step, no tracking.
