# Changelog

## 0.3.0
- Replaced placeholder Journey and Ideas popups with real views.
- Kept the shelf language as Currently Reading / Up Next / The Shelf.
- Added acquisition type, source/place, date, and date precision.
- First Start automatically records the first reading date.
- Every Start/Pause creates a distinct reading session; only one timer can run globally.
- Pause can capture current page and a quick note.
- Finish records a deliberate finished date.
- Journey is derived from reading events; no extra journey form.
- Ideas can be searched across reading notes and session notes can be promoted to Ideas.
- Reframed export as My Reading Data: full JSON archive + CSV spreadsheet.
- Reserved downstream architecture for PDF reports, charts, and yearly shareable recaps.
- Migrates V0.2 localStorage data on first run when available.
