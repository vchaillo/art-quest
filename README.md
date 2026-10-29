# ArtQuest

A responsive, French-language personal painting gallery, published on GitHub Pages.

## Features

- Explore 22 painters and 51 public-domain paintings from The Metropolitan Museum of Art.
- Painter profiles, movement filters, accent-insensitive search, alphabetical / chronological sorting.
- Painting details with original titles, medium, dimensions, credit line and museum source.
- Separate painter and artwork favorites stored in this browser's localStorage.
- Random artwork discovery, responsive layout, native accessible dialogs, reduced-motion support.

## Run locally

Requires Node.js 22+ for tests and Python 3 for the development server. No npm dependencies or build step.

```sh
npm test
npm start
```

Open http://localhost:8000. Files use relative paths and hash navigation to support project Pages hosting.

## Publication

GitHub Pages publishes `main` from the repository root. Every push automatically redeploys the static application. The CI workflow validates JavaScript and catalog integrity.

## Data and limitations

The initial catalog is a curated snapshot, retrieved from the Met Collection API on 2026-10-29. Only records marked `isPublicDomain: true` with available images were included. Images are served from the museum; the application does not require API calls at runtime. It is a small selection, not a complete catalog of the artists. Image availability depends on the museum. Biographical introductions are written for this app; original museum titles and technical metadata are retained in English.

Sources: https://metmuseum.github.io/ and https://www.metmuseum.org/about-the-met/policies-and-documents/open-access

Favorites are local to the browser. There is no authentication or cross-device synchronization in this first release. Clearing site data removes favorites. No analytics are installed. Fonts are served by Google Fonts, with local system fallbacks.

## Worldwide catalog (v2)

Typing at least two characters searches Wikidata for visual artists via `wbsearchentities`, then validates human/artist records using claims and descriptions. Open a result to load works linked by creator (`P170`) using WikibaseCirrusSearch, 24 at a time. The API continuation determines the next page. The count is the number of indexed records, not a catalogue raisonné or an image count. Images and file attribution are fetched through the Commons imageinfo API. Missing images remain visible as notices. This catalog is contributive and incomplete, especially for contemporary artists.

All requests are public, keyless CORS requests (`origin=*`). Searches are debounced and superseded requests are aborted. API errors are displayed with retry controls; successful responses are cached in memory for the session. The Met selection remains usable if external catalogs are unavailable. Remote artist and artwork favorite snapshots are persisted alongside existing favorites, including the parent artist of a favorite artwork. Favorites remain device-local.

Official API references:
- https://www.wikidata.org/wiki/Wikidata:Data_access
- https://www.mediawiki.org/wiki/Help:Extension:WikibaseCirrusSearch
- https://www.mediawiki.org/wiki/API:Imageinfo

Validation includes entity disambiguation, missing metadata/images, creator-scoped pagination and upstream error handling.
