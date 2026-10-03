# Changelog

## 0.4.0 — release candidate update
- Added Reader Feedback as an in-app beta notebook.
- Feedback records type, app area, free-text note, timestamp and app version.
- Feedback can be deleted and exported independently.
- Export is now scoped: Everything, Reading Records only, or Reader Feedback only.
- JSON remains the lossless canonical archive; CSV remains the human-readable spreadsheet view.
- Retains all V0.4 acquisition, retrospective first-start, session, Journey, Ideas and context-inheritance rules.

## 0.4.0
- Added timestamped Developer Notes inside My Reading Data for dogfooding friction, bugs, wishes, and observations; included in full JSON backup.
- First Start is explicitly labelled Start Reading and automatically creates Day 1.
- Subsequent starts are labelled Resume Reading and create new measured sessions without overwriting Day 1.
- First reading date can be added or corrected retrospectively; this does not fabricate measured reading time.
- Acquisition metadata can be added or edited at any point in a book's life, including while reading or after finishing.
- Acquisition date UI now combines precision and value: Exact / Month / Year / Around / Unknown.
- Recent acquisition context is remembered and prefilled for the next book, including place.
- Recent places are offered as reusable suggestions.
- Architecture reserves structured place IDs/map links and shared Acquisition Events for future photo-based bulk capture.
- Retains V0.3 Journey, Ideas, session notes, JSON backup and CSV export.

## 0.3.0
- First usable Reading Journey beta.
