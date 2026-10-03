# Reading Shelf V0

A deliberately small, local-first mobile reading tracker.

## What V0 already does
- Separate horizontally scrolling **Currently Reading** and **Up Next** rails.
- An uncategorized **Shelf** for wandering/cross-pollination.
- One active timer globally. Starting another book automatically pauses the current one.
- First-ever Start becomes the reading journey start.
- Pause saves a session and offers optional current page + quick note.
- Finish records completion.
- Optional acquisition provenance can be exact or deliberately vague.
- Search title, author and notes.
- JSON export/import backup.
- Cover photo can be taken/chosen on iPhone and is stored locally.

## Important V0 limitation
Cover-photo → automatic edition identification is *not faked*. V0 accepts the photo and metadata confirmation fields, but automatic OCR/catalog matching needs a small server/API layer. The data model is already edition-friendly so this can be added next without rewriting the tracker.

## Fastest local run
From this folder:

    python3 -m http.server 8080

Then open `http://localhost:8080`.

For iPhone use, deploy the folder to any static HTTPS host (GitHub Pages, Vercel, Netlify, Cloudflare Pages), open the URL in Safari, then Share → Add to Home Screen.

## Data
V0 uses browser `localStorage`. This makes it zero-backend and fast to test, but **export a JSON backup before clearing Safari website data**.

## Next build
1. Add cover/ISBN recognition and edition candidate confirmation.
2. Replace localStorage with IndexedDB or a managed database once multi-device sync matters.
3. CSV/notes migration assistant.
4. Reading Journey visualization.
5. Idea-bank semantic retrieval only after enough real notes exist.


## V0.2 visual direction
The approved phone direction is warm, scholarly, soft and feminine without being girly: espresso/walnut browns, restrained off-white, editorial serif display type, Apple-like spacing and controls, translucent surfaces, and an automatic deep dark mode.

## Data portability contract
`schema.json` documents the normalized record families that the app will migrate toward. V0.2 intentionally remains backward-compatible with the V0.1 localStorage prototype so existing test data is not destroyed. Before real archival use, the next storage step is IndexedDB with versioned migrations and a lossless export package.
