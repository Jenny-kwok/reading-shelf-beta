# Reading Shelf V0.4

Mobile-first, local-first personal reading archive.

V0.4 focuses on the actual capture loop: acquisition context can be inherited and edited later; Start Reading creates Day 1; Resume Reading creates measured sessions; retrospective history can be corrected without pretending it was timer-measured.

## Storage warning
This beta still uses browser `localStorage` on the specific website origin/device. It is not a synced cloud database. Clearing Safari website data may remove it. Use **My Reading Data → Full archive backup (.json)** regularly.

The app migrates V0.3 data on the same browser/origin when available.

## Planned infrastructure
IndexedDB + compressed cover assets + versioned migrations; structured place references/map links; photo-based bulk book capture; later optional sync/backend.

## Beta feedback
V0.4 includes a Reader Feedback view for dogfooding notes. Feedback is timestamped and tagged with the build version and can be exported separately from reading records.

## Export scopes
- Everything (.json): reading data + feedback + settings.
- Reading records (.json/.csv): book/reading archive without beta feedback.
- Feedback only (.json/.csv): developer-facing dogfooding notes.
