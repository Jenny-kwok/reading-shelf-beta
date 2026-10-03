# Changelog

## 0.1.0 — V0
- Created mobile-first Reading Shelf.
- Split face-out area into Currently Reading and Up Next horizontal rails.
- Kept the main shelf uncategorized to preserve browsing and cross-pollination.
- Added global single-book reading timer with automatic handoff.
- Added optional page/note logging after pause.
- Added exact-or-vague acquisition provenance.
- Added finish state and reading history.
- Added search across books and notes.
- Added JSON import/export.
- Added local cover-photo capture/selection.


## 0.2.0 — Visual direction + portable-data contract
- Adopted the approved visual direction: warm brown / deep brown, restrained off-white, scholarly and soft rather than beige/girly.
- Added automatic system dark mode styling.
- Preserved horizontal Currently Reading and Up Next rails and uncategorised browsing shelf.
- Added `schema.json` as the platform-neutral storage contract for the next migration.
- Declared stable UUID, normalized record, uncertainty-aware date, and lossless export principles.
- Kept V0.2 browser storage compatible with V0.1 while preparing migration away from nested app-specific records.
