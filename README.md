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
