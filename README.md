# Reading Shelf V0.3

A mobile-first, local-first personal reading archive.

V0.3 is the first usable Reading Journey beta: acquisition provenance, first-start semantics, restartable reading sessions, deliberate finish, Journey, Ideas, and portable exports.

## Data
- Runtime data stays in browser local storage in this beta.
- JSON is the canonical lossless backup.
- CSV is a human-friendly spreadsheet view.
- The event model preserves enough atomic data for later PDF reports, charts, yearly recaps, and migration to IndexedDB/server storage.
- V0.3 attempts to migrate existing V0.2 `readingShelfV0` data on first run.

## Run
Serve these files from any static HTTPS host, or locally with:
`python3 -m http.server 8080`

## Next infrastructure step
Before heavy archival use: migrate cover assets and records from localStorage to IndexedDB with versioned migrations and compressed images.
