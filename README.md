# Reading Shelf V0.5

V0.5 is the onboarding/data-safety beta built on V0.4 Final. New books always enter **The Shelf**; **Up Next** is optional; **Start Reading** may move a Shelf book directly to Currently Reading.

## New in V0.5
- Camera **or** Photo Library cover input.
- ISBN/title lookup through Open Library for metadata and covers.
- Acquisition-place shortcut into Google Maps.
- CSV/JSON reading-record import with preview.
- Full archive restore remains separate.
- Automatic V0.4 → V0.5 local-data migration.

## Interim safety
The runtime archive is still browser-local. Export **Everything JSON** before major upgrades. V0.5 deliberately does not pretend cloud sync exists.

## Import CSV headers
Recognised fields include: `Title`, `Author`, `ISBN`, `Publisher`, `Publication Year`, `Acquired`, `Acquisition Type`, `Place / from whom`, `First started`, `Finished`, `Language`. Missing fields are allowed. Imported records default to The Shelf. Historical start dates do not create fictional reading sessions.
