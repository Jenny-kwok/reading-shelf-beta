# Changelog

## 0.5.0
- Separate **Take photo** and **Choose from Photos** cover capture.
- Compress selected cover photos before local storage.
- Add ISBN/title/Open Library lookup with edition metadata preview and cover selection.
- Add Google Maps search linking for acquisition places without requiring a full typed address.
- Add **Import books / reading report** for CSV or JSON, with preview and duplicate count before import.
- Keep full Reading Shelf JSON restore as a separate disaster-recovery action, now with replacement confirmation.
- Migrate V0.4 local archive automatically into the V0.5 storage key.
- Preserve V0.4 Shelf/Up Next/Currently Reading, Day 1, sessions, feedback, acquisition and export rules.

### Deferred intentionally
- True multi-book recognition from one photo.
- Google Places autocomplete / Place ID selection (requires a configured Maps Platform project/API key).
- Cloud backend / cross-device sync.
- IndexedDB migration remains the next storage-hardening step; V0.5 keeps automatic V0.4 localStorage migration so the deploy is non-destructive.
