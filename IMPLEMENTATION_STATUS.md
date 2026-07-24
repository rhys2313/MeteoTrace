# MeteoTrace — implementation status

Updated: 2026-07-25 (Stage 1 only)

## Completed in Stage 1: working LIVE core

- Added dedicated, safe adapters and Route Handlers for EUMETSAT EUMETView and RainViewer. They use fixed official upstreams only, `AbortController` timeouts, strict input/content-type validation, bounded cache and clear retryable errors.
- EUMETView now reads products and UTC timestamps from live `GetCapabilities`; it does not use a static timeline or preselected layer IDs. The UI selects MSG 0° products from current provider metadata and maps available timestamps to the playback controls.
- RainViewer now reads actual historic radar frames from `weather-maps.json`, validates its returned host/path and creates XYZ tiles from those frames. Opaque current frame IDs are supported without permitting arbitrary paths.
- Added working timeline playback, frame stepping, opacity controls, RainViewer dBZ visual legend, EUMETView visualization disclaimer and source diagnostics.
- Added source states `LIVE`, `DEGRADED`, `OFFLINE`, `FALLBACK`, and `PUBLIC_VIEW_ONLY`. A source is only marked `LIVE` after the OpenLayers image/tile load event. RainViewer failure visibly falls back to EUMETView precipitation, then EUMETView IR.
- Added an explicit `PUBLIC_VIEW_ONLY` RosHydromet card and future-only environment variable placeholders. No undocumented endpoint, HTML scraping, authentication bypass or hidden API is used.

## Actual provider checks

| Environment | RainViewer | EUMETView |
| --- | --- | --- |
| Local server | `/api/rainviewer` returned `200`, 13 real frames; a current tile returned `200 image/png`, 14,098 B. | `/api/eumetsat/catalog` returned `503` because this local network closes the upstream TLS connection. The UI reports this rather than claiming LIVE. |
| Production `https://meteotrace.vercel.app` | Metadata returned `200`, 13 frames; current tile returned `200 image/png`, 14,270 B. The production screenshot showed `RAINVIEWER · LIVE` after a real map image load. | Catalog returned `200`, selected `msg_fes:rgb_natural`, `msg_fes:ir108`, `msg_fes:h60b`, and 16 current UTC frames. A production `GetMap` for the latest Natural Colour frame returned `200 image/png`, 51,411 B. |

Latest verified production deployment: `https://meteotrace-ex4k7sfd1-cbnus.vercel.app` (aliased to `https://meteotrace.vercel.app`).

## Validation

- `npm test` — 6/6 passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed locally and on Vercel.

## Known limitations and remaining work

- The local environment cannot complete EUMETView TLS, so local EUMETView remains correctly degraded; the public Vercel route and actual WMS image were verified.
- RainViewer coverage is not universal. Its absence is not interpreted as absence of precipitation; the visible fallback order is used.
- RosHydromet/meteoinfo official sites expose public viewer/material pages, but this research did not confirm a documented legal public WMS/WMTS/raster API appropriate for integration. Status remains `PUBLIC_VIEW_ONLY`.
- Not started by design: FMI, DWD, OPERA, commercial sources, lightning integration, font replacement, broad end-to-end and visual regression suites, and later specification stages.
