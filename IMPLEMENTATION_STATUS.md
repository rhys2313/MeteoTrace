# MeteoTrace — implementation status

Updated: 2026-07-25 (Stage 1 only)

## Implemented in this correction

- RainViewer metadata and EUMETView catalog are fetched independently. A slow or failed EUMETView catalog no longer delays a usable RainViewer layer.
- Provider API state is distinct from browser rendering state: `API_LOADING`, `API_LIVE`, `API_ERROR` are shown separately from `LAYER_LOADING`, `LAYER_LIVE`, `NO_ECHOES`, `NO_COVERAGE`, and `LAYER_ERROR`.
- The OpenLayers weather layer is stable across ordinary React state updates. It is recreated only when source/frame/product changes; opacity changes update the existing layer.
- RainViewer diagnostics expose selected UTC timestamp, starts/successes/errors, detected echo pixels, visible flag, opacity, z-index, and the non-secret XYZ URL.
- Weather raster colors are no longer suppressed by the map-wide grayscale/brightness CSS filter. Weather layers are created with `visible=true`, `zIndex=10`; the marker is at z-index 20.
- EUMETView GetMap recognizes both `request` and OpenLayers’ `REQUEST`, validates against all layer IDs present in the live GetCapabilities response, and retains strict upstream, timeout, image-content-type, and parameter controls.
- `/api/version` adds the short Vercel/Git commit identifier to the UI diagnostics.

## Local factual checks

| Item | Result |
| --- | --- |
| RainViewer metadata | `/api/rainviewer` returned `200 application/json`. |
| RainViewer raster | Browser loaded 15 real RainViewer XYZ PNG tiles: 15 successful, 0 errors, `visible=true`, opacity `70%`, z-index `10`; raster inspection found 97,659 colored echo pixels. |
| Example tile form | `https://tilecache.rainviewer.com/v2/radar/<current-frame>/256/5/17/10/2/1_1.png` returned `200 image/png`; this confirms normal EPSG:3857 XYZ `z/x/y` addressing. |
| EUMETView locally | The local network closed TLS while requesting the official WMS GetCapabilities endpoint, so the local route correctly returned `503` and did not claim a visible satellite layer. |

## Validation completed before production verification

- `npm run test` — 6/6 passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.

## Production verification

The corrected build is pending deployment and browser verification on `https://meteotrace.vercel.app`. This file will be updated with the deployed commit, exact API/tile/GetMap responses, and visual screenshot results only after that verification.

## Not started by design

Stages 2–4 remain out of scope: FMI, DWD, OPERA, lightning, commercial sources, font work, and broad test suites were not added. RosHydromet remains `PUBLIC_VIEW_ONLY` because no documented legal public raster service was confirmed.
