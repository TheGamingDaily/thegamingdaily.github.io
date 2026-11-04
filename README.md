# Form · Calisthenics Tracker (Dark)

A small, private workout tracker. No account, framework, or external services required.

## Workout schedule

- **Monday, 21:00:** football (displayed in the calendar; not logged as a calisthenics session)
- **Wednesday, Friday, Sunday, 17:00–18:00:** Upper Body + Abs
- **Tuesday, Thursday, Saturday:** recovery days from this strength routine

### Upper body (in order)

1. Standard Push-Ups — **2 × 15 reps**
2. Seated Towel Isometric Rows — **3 × 25 seconds**
3. Pike Push-Ups — **2 × 10 reps**
4. Reverse Snow Angels — **2 × 12 reps**
5. Decline Push-Ups — **2 × 10 reps**
6. Towel Biceps Curls — **2 × 15 reps**

Rest **60–90 seconds between sets** and **90–120 seconds between exercises**.

### Abs (three supersets)

- Floor Crunches — **12 reps per round**
- Lying Leg-Hip Raises — **12 reps per round**

Perform both in sequence; rest **60–90 seconds between rounds**. Warm up **5–8 minutes** and cool down briefly. Technique cues remain accessible in the workout.

These fixed numbers are practical working targets selected within your previous ranges; they are **not** uniquely optimal for every person. Log what you actually complete, even if fewer reps, and prioritize form and recovery.

## Run

Keep `index.html`, `app.js`, and `styles.css` together. For reliable browser storage, run in this folder:

```sh
python -m http.server 8000
```

Open `http://localhost:8000` in your browser. Alternatively, host the same files at one stable HTTPS address. **For an iPhone, hosting is usually the easiest approach**: open the site in Safari and select *Share → Add to Home Screen*.

## Track and back up

- Go to **Workout → Start workout**. Enter actual reps/seconds, optionally resistance and notes, and check individual completed sets.
- Changes save automatically. You can leave and later resume an unfinished session.
- Use **Finish & save workout** to log the session. **History** allows review and editing; **Progress** summarizes actual logged results.
- Use **Data → Export JSON backup** regularly. **Import** validates the JSON and offers merge (does not overwrite existing session IDs) or replace (requires confirmation).
- Deletion requires confirmation. All session records store their own workout-plan snapshot so the updated targets do not rewrite history.

## Migrating from an earlier version

Deploy these updated files to **the same hostname, scheme, and port** as the existing site to reuse browser-local workout data. The app upgrades its stored program to version 2 but preserves previous sessions and their original targets. If moving sites or devices, first export JSON from the old site and import it into the new one.

## Storage limitations

Workout data is stored in `localStorage`, separately for each browser and website origin. It does not synchronize across devices. Clearing browser data, private browsing, or losing access to that origin can lose records. Local `file://` access is less reliable. **Keep JSON backups.** The website does not transmit data to third parties.

## Verification

Browser-based isolated tests checked dark rendering, fixed targets and schedule, 19 set controls, editing, finishing, simulated storage reopening, preserved older session snapshots during program upgrade, JSON export/import with validation, duplicate handling, typed deletion confirmation, and responsive layout at 320–1280 px. The browser sandbox blocked opening a localhost origin, so tests used a simulated storage API; persistent `localStorage` across a true browser restart was **not** directly verified in this environment.
